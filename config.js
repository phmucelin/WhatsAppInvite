// Configuração da WhatsApp Business API
// Substitua pelos seus dados reais

const whatsappConfig = {
    accessToken: 'EAASi801Kb78BPeH9sV7DFciU9c9BEukINEZC2WY64s2pXyLHcQtGbpYbRThDodgJUh6MM8Mob9WkoNC3ZB7Ihe65nmfYitW7ZBS8sxWpuslfPzlCkPC3Jz9G3sCcbplBecV0Fp6YfHvmt79hZAw0jk1spRsjyus6pU2XEDwo4QZAUYGuin5RQjyfMEBMLpnTLcLkhLUIZBp6aR9MZBpdub582UNV2hnzBocBXPEjShwtgyO7IoZD',
    phoneNumberId: '708614075678281',
    apiUrl: 'https://graph.facebook.com/v23.0', // Versão correta da API
    settings: {
        maxRetries: 3,
        delayBetweenMessages: 1000,
        enableImages: true,
        enableNotifications: true
    }
};

function validateConfig() {
    if (!whatsappConfig.accessToken || whatsappConfig.accessToken.length < 100) {
        console.error('❌ Access Token inválido ou muito curto');
        return false;
    }
    if (!whatsappConfig.phoneNumberId || whatsappConfig.phoneNumberId.length < 10) {
        console.error('❌ Phone Number ID inválido');
        return false;
    }
    console.log('✅ Configuração válida!');
    return true;
}

// Função para formatar número de telefone
function formatPhoneNumber(phone) {
    // Remover todos os caracteres não numéricos, exceto +
    let formatted = phone.replace(/[^\d+]/g, '');
    
    // Garantir que começa com +
    if (!formatted.startsWith('+')) {
        formatted = '+' + formatted;
    }
    
    // Verificar se tem pelo menos 10 dígitos
    const digits = formatted.replace(/\D/g, '');
    if (digits.length < 10) {
        throw new Error('Número de telefone muito curto');
    }
    
    return formatted;
}

// Função para enviar mensagem via WhatsApp Business API
async function sendWhatsAppMessage(phone, message, imageUrl = null) {
    if (!validateConfig()) {
        throw new Error('Configuração inválida. Verifique config.js');
    }
    
    try {
        // Formatar número de telefone
        const formattedPhone = formatPhoneNumber(phone);
        console.log('📱 Número formatado:', formattedPhone);
        console.log('🔑 Token:', whatsappConfig.accessToken.substring(0, 20) + '...');
        console.log('📞 Phone Number ID:', whatsappConfig.phoneNumberId);
        console.log('🌐 API URL:', whatsappConfig.apiUrl);
        
        let requestBody;
        
        if (imageUrl && whatsappConfig.settings.enableImages) {
            // Enviar com imagem
            requestBody = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'image',
                image: {
                    link: imageUrl,
                    caption: message
                }
            };
        } else {
            // Enviar apenas texto
            requestBody = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: { body: message }
            };
        }
        
        console.log('📤 Enviando requisição:', JSON.stringify(requestBody, null, 2));
        console.log('🔗 URL completa:', `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`);
        
        const response = await fetch(`${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('📥 Status da resposta:', response.status);
        console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.json();
        console.log('📥 Resposta completa:', result);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${result.error?.message || 'Erro desconhecido'}`);
        }
        
        console.log('✅ Mensagem enviada com sucesso:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        throw error;
    }
}

// Função para enviar múltiplas mensagens
async function sendBulkMessages(messages) {
    const results = [];
    
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        try {
            // Aguardar entre mensagens para não sobrecarregar a API
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, whatsappConfig.settings.delayBetweenMessages));
            }
            
            const result = await sendWhatsAppMessage(message.phone, message.text, message.imageUrl);
            results.push({
                success: true,
                guest: message.guest,
                phone: message.phone,
                result: result
            });
            
            // Atualizar progresso
            if (typeof updateProgressBar === 'function') {
                updateProgressBar(i + 1, messages.length);
            }
            
        } catch (error) {
            results.push({
                success: false,
                guest: message.guest,
                phone: message.phone,
                error: error.message
            });
        }
    }
    
    return results;
}

// Função para testar se a API está funcionando
async function testAPIAccess() {
    try {
        console.log('🔍 Testando acesso à API...');
        
        // Testar se conseguimos acessar as informações do número
        const testUrl = `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}`;
        console.log('🔗 Testando URL:', testUrl);
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${whatsappConfig.accessToken}`
            }
        });
        
        console.log('📥 Status da resposta:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ API acessível:', result);
            return true;
        } else {
            const error = await response.json();
            console.log('❌ Erro ao acessar API:', error);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro no teste de acesso:', error);
        return false;
    }
}

// Função para testar a conexão
async function testConnection() {
    try {
        console.log('🧪 Testando conexão com WhatsApp Business API...');
        
        if (!validateConfig()) {
            throw new Error('Configuração inválida');
        }
        
        // Primeiro, testar se a API responde
        console.log('🔍 Testando resposta da API...');
        const apiAccess = await testAPIAccess();
        
        if (!apiAccess) {
            throw new Error('Não foi possível acessar a API');
        }
        
        // Agora testar envio de mensagem
        console.log('📱 Testando envio de mensagem...');
        const testMessage = '🧪 Teste de conexão - Sistema de Convites funcionando!';
        const testPhone = '+5521966154482'; // Seu número real
        
        console.log('📱 Testando com número:', testPhone);
        
        const result = await sendWhatsAppMessage(testPhone, testMessage);
        console.log('✅ Conexão testada com sucesso!');
        return true;
        
    } catch (error) {
        console.error('❌ Erro no teste de conexão:', error);
        return false;
    }
}

// Exportar funções para uso no script principal
window.whatsappAPI = {
    sendMessage: sendWhatsAppMessage,
    sendBulkMessages: sendBulkMessages,
    testConnection: testConnection,
    validateConfig: validateConfig
}; 