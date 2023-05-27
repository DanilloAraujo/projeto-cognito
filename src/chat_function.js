const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'chat_conversations';

exports.handler = async (event, context) => {
    try {
        // Extrai informações da solicitação do evento recebido do API Gateway
        const { conversationId, message, userId } = JSON.parse(event.body);

        // Verificar se o usuário tem permissão para acessar a conversa (exemplo de autenticação)
        if (!userHasPermission(userId, conversationId)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'Acesso negado' })
            };
        }

        // Salva a mensagem no DynamoDB
        const timestamp = new Date().toISOString();
        await dynamodb.put({
            TableName: tableName,
            Item: { conversationId, timestamp, message }
        }).promise();

        // Recupera as mensagens da conversa
        const result = await dynamodb.query({
            TableName: tableName,
            KeyConditionExpression: 'conversationId = :conversationId',
            ExpressionAttributeValues: {
                ':conversationId': conversationId
            }
        }).promise();

        const messages = result.Items.map(item => ({
            timestamp: item.timestamp,
            message: item.message
        }));

        // Responde ao usuário com as mensagens da conversa
        const response = {
            statusCode: 200,
            body: JSON.stringify({ messages })
        };

        return response;
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Ocorreu um erro ao processar sua solicitação' })
        };
    }
};

async function userHasPermission(userId, conversationId) {
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const permissionsTableName = 'chat_permissions';

    try {
        // Verifica se existe uma permissão correspondente para o usuário e a conversa
        const result = await dynamodb.get({
            TableName: permissionsTableName,
            Key: { userId: userId, conversationId: conversationId }
        }).promise();

        // Verifica se a permissão existe e está ativa
        if (result.Item && result.Item.active) {
            return true; // O usuário tem permissão para acessar a conversa
        } else {
            return false; // O usuário não tem permissão para acessar a conversa
        }
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        return false; // Em caso de erro, consideramos que o usuário não tem permissão
    }
}

