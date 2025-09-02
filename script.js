// Variáveis globais
let guests = [];
let eventData = {};
let confirmationLinks = {};
let selectedImage = null; // Garantir que está definida globalmente

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadStoredData();
});

function initializeApp() {
    // Carregar dados da planilha padrão se existir
    loadDefaultCSV();
    
    // Configurar data padrão (próximo sábado)
    const nextSaturday = getNextSaturday();
    document.getElementById('eventDate').value = nextSaturday;
    
    // Carregar imagem salva do localStorage
    loadSavedImage();
    
    // Atualizar preview inicial
    updateDashboard();
}

function setupEventListeners() {
    // Upload de arquivo CSV
    document.getElementById('csvFile').addEventListener('change', handleCSVUpload);
    
    // Botão para adicionar convidados de teste
    document.getElementById('addTestGuests').addEventListener('click', addTestGuests);
    
    // Campos do evento
    document.getElementById('eventName').addEventListener('input', updateInvitePreview);
    document.getElementById('eventDate').addEventListener('input', updateInvitePreview);
    document.getElementById('eventLocation').addEventListener('input', updateInvitePreview);
    document.getElementById('eventDescription').addEventListener('input', updateInvitePreview);
    
    // Gerenciamento de imagens
    document.getElementById('inviteImage').addEventListener('change', handleImageSelection);
    document.getElementById('customImageUpload').addEventListener('change', handleCustomImageUpload);
    
    // Botões
    document.getElementById('downloadInvite').addEventListener('click', downloadInviteAsPNG);
    document.getElementById('sendAll').addEventListener('click', showWhatsAppModal);
    document.getElementById('sendTest').addEventListener('click', sendTestMessage);
    document.getElementById('testAPI').addEventListener('click', testWhatsAppAPI);
    
    // Modal
    document.getElementById('openWhatsApp').addEventListener('click', openWhatsAppWeb);
    document.getElementById('closeModal').addEventListener('click', closeWhatsAppModal);
    
    // Fechar modal ao clicar fora
    document.getElementById('whatsappModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeWhatsAppModal();
        }
    });
    
    // Listener para atualizações de confirmação em tempo real
    window.addEventListener('message', function(event) {
        if (event.data.type === 'confirmation_update') {
            // Atualizar o convidado localmente
            const guest = guests.find(g => g.id === event.data.guestId);
            if (guest) {
                guest.status = event.data.status;
                saveData();
                updateDashboard();
                
                // Mostrar notificação
                showNotification(
                    `${event.data.guestName || 'Convidado'} ${event.data.status === 'confirmed' ? 'confirmou' : 'não confirmou'} presença!`, 
                    'success'
                );
            }
        }
    });
    
    // Verificar atualizações do localStorage periodicamente (backup para casos especiais)
    setInterval(checkForUpdates, 5000); // Verificar a cada 5 segundos (menos frequente com Live Server)
}

// Funções de carregamento de dados
function loadDefaultCSV() {
    // Não tentar carregar CSV padrão se não existir
    console.log('ℹ️ Nenhum CSV padrão configurado. Faça upload de um arquivo CSV.');
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            parseCSVData(e.target.result);
        };
        reader.readAsText(file);
    }
}

function parseCSVData(csvText) {
    const lines = csvText.split('\n');
    guests = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const guest = {
                nome: values[0] || '',
                numero: values[1] || '',
                status: 'pending',
                id: generateGuestId()
            };
            guests.push(guest);
        }
    }
    
    console.log('✅ Convidados carregados:', guests.length);
    saveData();
    updateDashboard();
}

function displayGuestsPreview() {
    const preview = document.getElementById('preview');
    if (guests.length > 0) {
        preview.innerHTML = `
            <h4>Convidados carregados (${guests.length}):</h4>
            <div class="guests-preview">
                ${guests.slice(0, 5).map(guest => `
                    <div class="guest-preview-item">
                        <strong>${guest.nome}</strong> - ${guest.numero}
                    </div>
                `).join('')}
                ${guests.length > 5 ? `<p>... e mais ${guests.length - 5} convidados</p>` : ''}
            </div>
        `;
    } else {
        preview.innerHTML = '<p>Nenhum convidado encontrado no arquivo.</p>';
    }
}

function addTestGuests() {
    const testGuests = [
        { nome: "João Silva", numero: "11999999999" },
        { nome: "Maria Santos", numero: "11888888888" },
        { nome: "Pedro Costa", numero: "11777777777" },
        { nome: "Ana Oliveira", numero: "11666666666" },
        { nome: "Carlos Ferreira", numero: "11555555555" }
    ];
    
    guests = testGuests.map(guest => ({
        ...guest,
        status: 'pending',
        id: generateGuestId()
    }));
    
    displayGuestsPreview();
    updateDashboard();
    saveData();
    
    showNotification('5 convidados de teste adicionados!', 'success');
}

// Funções de preview e geração de convite
function updateInvitePreview() {
    const eventName = document.getElementById('eventName').value || 'Nome do Evento';
    const eventDate = document.getElementById('eventDate').value;
    const eventLocation = document.getElementById('eventLocation').value || 'Local do evento';
    const eventDescription = document.getElementById('eventDescription').value || 'Descrição do evento';
    
    // Atualizar elementos do preview
    document.getElementById('previewEventName').textContent = eventName;
    document.getElementById('previewEventDate').textContent = formatDate(eventDate);
    document.getElementById('previewEventLocation').textContent = eventLocation;
    document.getElementById('previewEventDescription').textContent = eventDescription;
    
    // Gerar QR Code
    generateQRCode();
    
    // Salvar dados do evento
    eventData = {
        name: eventName,
        date: eventDate,
        location: eventLocation,
        description: eventDescription
    };
    
    saveData();
}

function generateQRCode() {
    const qrContainer = document.getElementById('qrCode');
    qrContainer.innerHTML = '';
    
    // Gerar link de confirmação único para o evento
    const confirmationLink = generateConfirmationLink();
    
    new QRCode(qrContainer, {
        text: confirmationLink,
        width: 80,
        height: 80,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Função para criar dados de teste que funcionem em dispositivos móveis
function createTestDataForMobile(eventId, guestId) {
    return {
        eventData: {
            name: 'Evento de Teste',
            date: new Date().toISOString(),
            location: 'Local do Evento',
            description: 'Descrição do evento de teste para dispositivos móveis'
        },
        guests: [{
            id: guestId,
            nome: 'Convidado',
            numero: '+5511999999999',
            status: 'pending'
        }]
    };
}

// Função para comprimir imagem de forma síncrona
function compressImageSync(imageDataUrl, maxWidth = 400) {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Carregar imagem de forma síncrona
    img.src = imageDataUrl;
    
    // Calcular dimensões mantendo proporção
    const ratio = maxWidth / img.width;
    const newWidth = maxWidth;
    const newHeight = img.height * ratio;
    
    // Configurar canvas
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Desenhar imagem redimensionada
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    // Retornar imagem comprimida com qualidade ainda menor para URLs mais curtas
    const quality = maxWidth <= 200 ? 0.3 : 0.5;
    return canvas.toDataURL('image/jpeg', quality);
}

// Função para gerar link de confirmação com fallback para mobile
function generateConfirmationLink(guestId = null) {
    const eventId = generateEventId();
    
    // Detectar se está rodando localmente ou em servidor
    let baseUrl;
    if (window.location.protocol === 'file:') {
        // Rodando localmente - usar caminho relativo
        baseUrl = './convite.html';
    } else {
        // Rodando em servidor - usar URL completa
        baseUrl = `${window.location.origin}/convite.html`;
    }
    
    // Codificar parâmetros para evitar problemas de URL
    const encodedEvent = encodeURIComponent(eventId);
    const encodedGuest = guestId ? encodeURIComponent(guestId) : '';
    
    // Adicionar timestamp para evitar cache em dispositivos móveis
    const timestamp = Date.now();
    
    // SOLUÇÃO ULTRA-OTIMIZADA: Usar apenas dados essenciais e comprimir ao máximo
    let eventParams = '';
    
    // Comprimir nome do evento (máximo 20 caracteres)
    const eventName = (eventData.name || 'Evento').substring(0, 20);
    eventParams += `&n=${encodeURIComponent(eventName)}`;
    
    // Comprimir data (usar formato ultra-curto DD/MM)
    if (eventData.date) {
        const date = new Date(eventData.date);
        const shortDate = `${date.getDate()}/${date.getMonth() + 1}`;
        eventParams += `&d=${encodeURIComponent(shortDate)}`;
    }
    
    // Comprimir local (máximo 15 caracteres)
    const eventLocation = (eventData.location || 'Local').substring(0, 15);
    eventParams += `&l=${encodeURIComponent(eventLocation)}`;
    
    // Comprimir descrição (máximo 25 caracteres)
    const eventDescription = (eventData.description || 'Descrição').substring(0, 25);
    eventParams += `&desc=${encodeURIComponent(eventDescription)}`;
    
    // Adicionar nome do convidado se disponível (máximo 15 caracteres)
    let nameParam = '';
    if (guestId) {
        const guest = guests.find(g => g.id === guestId);
        if (guest && guest.nome) {
            const shortName = guest.nome.substring(0, 15);
            nameParam = `&nm=${encodeURIComponent(shortName)}`;
        }
    }
    
    // SOLUÇÃO ULTRA-OTIMIZADA: Não incluir imagem na URL - usar localStorage
    let imageParam = '';
    if (selectedImage) {
        try {
            // Gerar um hash único para a imagem
            const imageHash = generateImageHash(selectedImage);
            
            // Salvar imagem no localStorage com o hash e timestamp
            localStorage.setItem(`img_${imageHash}`, selectedImage);
            localStorage.setItem(`img_${imageHash}_time`, Date.now().toString());
            
            // Usar apenas o hash na URL (muito menor)
            imageParam = `&ih=${imageHash}`;
            console.log('🖼️ Imagem salva no localStorage, hash na URL:', imageHash);
        } catch (error) {
            console.error('❌ Erro ao processar imagem:', error);
        }
    }
    
    if (guestId) {
        // Usar a nova página de convite personalizada com parâmetros ultra-otimizados
        const finalUrl = `${baseUrl}?e=${encodedEvent}&g=${encodedGuest}${nameParam}${eventParams}${imageParam}&t=${timestamp}`;
        return finalUrl;
    }
    return `${baseUrl}?e=${encodedEvent}&t=${timestamp}`;
}

function generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Função para gerar hash único da imagem
function generateImageHash(imageDataUrl) {
    try {
        // Gerar um hash simples baseado no conteúdo da imagem
        let hash = 0;
        const str = imageDataUrl.substring(0, 100); // Usar apenas os primeiros 100 caracteres
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converter para 32-bit integer
        }
        
        // Retornar hash em base36 para ser mais curto
        const finalHash = Math.abs(hash).toString(36).substring(0, 8);
        console.log('🔐 Hash da imagem gerado:', finalHash);
        return finalHash;
    } catch (error) {
        console.error('❌ Erro ao gerar hash da imagem:', error);
        // Fallback: usar timestamp como hash
        return Date.now().toString(36).substring(0, 8);
    }
}

function generateGuestId() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Funções de download e envio
function downloadInviteAsPNG() {
    const inviteCard = document.querySelector('.invite-card');
    
    html2canvas(inviteCard, {
        backgroundColor: null,
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `convite_${eventData.name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}

function showWhatsAppModal() {
    if (guests.length === 0) {
        alert('Por favor, carregue uma lista de convidados primeiro.');
        return;
    }
    
    if (!eventData.name || !eventData.date) {
        alert('Por favor, preencha as informações do evento.');
        return;
    }
    
    // Sempre mostrar a interface de seleção manual
    document.getElementById('manualStatus').style.display = 'block';
    
    document.getElementById('whatsappModal').classList.remove('hidden');
}

function closeWhatsAppModal() {
    document.getElementById('whatsappModal').classList.add('hidden');
}

function openWhatsAppWeb() {
    const whatsappNumber = document.getElementById('whatsappNumber').value;
    if (!whatsappNumber) {
        alert('Por favor, insira seu número do WhatsApp.');
        return;
    }
    
    // Sempre usar o sistema de seleção manual
    prepareMessages();
    
    // Abrir WhatsApp Web
    window.open('https://web.whatsapp.com/', '_blank');
    
    closeWhatsAppModal();
}

function prepareMessages() {
    try {
        // Validar dados necessários
        if (!eventData.name) {
            alert('Por favor, preencha o nome do evento.');
            return;
        }
        
        if (!eventData.date) {
            alert('Por favor, preencha a data do evento.');
            return;
        }
        
        if (guests.length === 0) {
            alert('Por favor, carregue uma lista de convidados.');
            return;
        }
        
        const messageTemplate = document.getElementById('messageTemplate').value;
        if (!messageTemplate.trim()) {
            alert('Por favor, preencha o modelo de mensagem.');
            return;
        }
        
        console.log('✅ Dados validados, preparando mensagens...');
        
        // Mostrar estatísticas de otimização da URL
        showURLOptimizationStats();
        
        // Gerar mensagens para cada convidado com link único
        const messages = guests.map(guest => {
            const confirmationLink = generateConfirmationLink(guest.id);
            
            // Criar mensagem mais compacta para evitar URLs muito longas
            let message = messageTemplate
                .replace(/{nome}/g, guest.nome)
                .replace(/{evento}/g, eventData.name || 'Evento')
                .replace(/{data}/g, formatDate(eventData.date) || 'Data')
                .replace(/{hora}/g, formatTime(eventData.date) || 'Hora')
                .replace(/{local}/g, eventData.location || 'Local')
                .replace(/{descricao}/g, eventData.description || 'Descrição')
                .replace(/{link}/g, confirmationLink);
            
            return {
                guest: guest,
                message: message,
                phone: guest.numero,
                imageUrl: selectedImage,
                confirmationLink: confirmationLink
            };
        });
        
        // Criar interface de envio
        createMessageInterface(messages);
        
    } catch (error) {
        console.error('❌ Erro ao preparar mensagens:', error);
        alert('Erro ao preparar mensagens. Tente novamente.');
    }
}

// Função para mostrar estatísticas de otimização da URL
function showURLOptimizationStats() {
    if (selectedImage) {
        const oldURL = generateOldStyleURL();
        const newURL = generateConfirmationLink('test');
        
        const oldLength = oldURL.length;
        const newLength = newURL.length;
        const reduction = Math.round(((oldLength - newLength) / oldLength) * 100);
        
        console.log('📊 Estatísticas de otimização da URL:');
        console.log(`📏 URL antiga: ${oldLength} caracteres`);
        console.log(`📏 URL nova: ${newLength} caracteres`);
        console.log(`📉 Redução: ${reduction}%`);
        
        // Mostrar notificação
        showNotification(`URL otimizada! Redução de ${reduction}% no tamanho`, 'success');
    }
}

// Função para gerar URL no estilo antigo (para comparação)
function generateOldStyleURL() {
    const baseUrl = window.location.protocol === 'file:' ? './convite.html' : `${window.location.origin}/convite.html`;
    const eventId = generateEventId();
    const guestId = 'test';
    
    let url = `${baseUrl}?event=${eventId}&guest=${guestId}`;
    url += `&eventName=${encodeURIComponent(eventData.name || 'Evento')}`;
    url += `&eventDate=${encodeURIComponent(eventData.date || new Date().toISOString())}`;
    url += `&eventLocation=${encodeURIComponent(eventData.location || 'Local do evento')}`;
    url += `&eventDescription=${encodeURIComponent(eventData.description || 'Descrição do evento')}`;
    url += `&name=${encodeURIComponent('Teste')}`;
    
    if (selectedImage) {
        url += `&image=${encodeURIComponent(selectedImage)}`;
    }
    
    return url;
}

function createMessageInterface(messages) {
    // Criar modal de envio
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'messageModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content message-modal';
    modalContent.style.maxWidth = '900px';
    modalContent.style.width = '95%';
    
    modalContent.innerHTML = `
        <h3><i class="fab fa-whatsapp"></i> Envio de Mensagens WhatsApp</h3>
        <p style="margin-bottom: 20px;">
            <strong>🎉 NOVO: Páginas Personalizadas!</strong><br>
            Cada convidado receberá um link único que abre uma página com:<br>
            ✅ <strong>Imagem do convite</strong> (se selecionada)<br>
            ✅ <strong>Informações completas</strong> do evento<br>
            ✅ <strong>Botões de confirmação</strong> direto na página<br>
            ✅ <strong>Experiência profissional</strong> para seus convidados!
        </p>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
            <strong>📱 Como Enviar:</strong><br>
            • <strong>Seleção Individual:</strong> Marque os convidados que deseja enviar<br>
            • <strong>Envio em Lote:</strong> Clique em "Enviar Selecionados" para abrir WhatsApp Web<br>
            • <strong>Envio Individual:</strong> Clique em "Enviar" para cada convidado específico
        </div>
        
        <div class="messages-container" style="max-height: 500px; overflow-y: auto; margin-bottom: 20px;">
            ${messages.map((msg, index) => `
                <div class="message-item" data-guest-id="${msg.guest.id}" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <input type="checkbox" id="guest_${msg.guest.id}" class="guest-checkbox" checked style="transform: scale(1.2);">
                            <div>
                                <strong>${msg.guest.nome}</strong>
                                <span style="color: #666; margin-left: 10px;">${msg.phone}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="copyMessageToClipboard(\`${msg.message.replace(/`/g, '\\`')}\`)" 
                                    class="btn-copy-message" 
                                    style="background: #17a2b8; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">
                                <i class="fas fa-copy"></i> Copiar
                            </button>
                            <button onclick="sendSingleMessage('${msg.guest.id}')" 
                                    class="btn-send-single" 
                                    style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                                <i class="fab fa-whatsapp"></i> Enviar
                            </button>
                        </div>
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 0.9rem; max-height: 100px; overflow-y: auto;">
                        ${msg.message.replace(/\n/g, '<br>')}
                    </div>
                    <div class="message-status" id="status_${msg.guest.id}" style="margin-top: 10px; padding: 8px; border-radius: 5px; background: #f8f9fa; color: #666; font-size: 0.9rem; text-align: center; display: none;">
                        ⏳ Aguardando envio...
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="margin-bottom: 15px;">
                <button onclick="selectAllGuests()" class="btn" style="background: #6c757d; margin-right: 10px;">
                    <i class="fas fa-check-square"></i> Selecionar Todos
                </button>
                <button onclick="deselectAllGuests()" class="btn" style="background: #6c757d;">
                    <i class="fas fa-square"></i> Desmarcar Todos
                </button>
            </div>
            <div>
                <button onclick="sendSelectedMessages()" class="btn-send-selected" 
                        style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-right: 10px; font-size: 1.1rem;">
                    <i class="fas fa-paper-plane"></i> Enviar Selecionados (${messages.length} convidados)
                </button>
                <button onclick="closeMessageModal()" class="btn-secondary">
                    Fechar
                </button>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Adicionar listeners para checkboxes
    const checkboxes = modal.querySelectorAll('.guest-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedCounter);
    });
    
    // Atualizar contador inicial
    updateSelectedCounter();
    
    // Salvar mensagens globalmente
    window.preparedMessages = messages;
}

// Função para abrir WhatsApp com mensagem formatada
function openWhatsAppWithMessage(phone, message) {
    try {
        // Limpar e formatar número de telefone
        let cleanPhone = phone.replace(/\D/g, '');
        
        // Adicionar código do país se não tiver
        if (!cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone;
        }
        
        // Verificar se o número é válido
        if (cleanPhone.length < 10) {
            alert('Número de telefone inválido: ' + phone);
            return;
        }
        
        // Codificar mensagem para URL
        const encodedMessage = encodeURIComponent(message);
        
        // Criar link do WhatsApp
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        
        console.log('📱 Abrindo WhatsApp:', whatsappUrl);
        console.log('📱 Número formatado:', cleanPhone);
        console.log('📱 Mensagem:', message.substring(0, 100) + '...');
        
        // Abrir em nova aba
        window.open(whatsappUrl, '_blank');
        
    } catch (error) {
        console.error('❌ Erro ao abrir WhatsApp:', error);
        alert('Erro ao abrir WhatsApp. Tente novamente.');
    }
}

// Função para enviar mensagem individual
function sendSingleMessage(guestId) {
    try {
        const guest = guests.find(g => g.id === guestId);
        if (!guest) {
            console.error('❌ Convidado não encontrado:', guestId);
            alert('Convidado não encontrado. Tente novamente.');
            return;
        }
        
        if (!guest.numero) {
            console.error('❌ Número não encontrado para:', guest.nome);
            alert('Número de telefone não encontrado para ' + guest.nome);
            return;
        }
        
        const messageTemplate = document.getElementById('messageTemplate').value;
        const confirmationLink = generateConfirmationLink(guest.id);
        
        // Criar mensagem compacta
        let message = messageTemplate
            .replace(/{nome}/g, guest.nome)
            .replace(/{evento}/g, eventData.name || 'Evento')
            .replace(/{data}/g, formatDate(eventData.date) || 'Data')
            .replace(/{hora}/g, formatTime(eventData.date) || 'Hora')
            .replace(/{local}/g, eventData.location || 'Local')
            .replace(/{descricao}/g, eventData.description || 'Descrição')
            .replace(/{link}/g, confirmationLink);
        
        console.log('📤 Enviando mensagem para:', guest.nome);
        console.log('📱 Número:', guest.numero);
        console.log('🔗 Link:', confirmationLink);
        
        // Abrir WhatsApp com mensagem
        openWhatsAppWithMessage(guest.numero, message);
        
        // Marcar como enviado
        markAsSent(guestId);
        
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem. Tente novamente.');
    }
}

function copyMessageToClipboard(message) {
    navigator.clipboard.writeText(message).then(() => {
        // Mostrar notificação de sucesso
        showNotification('Mensagem copiada para a área de transferência!', 'success');
    }).catch(() => {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Mensagem copiada para a área de transferência!', 'success');
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#667eea'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 2000;
        font-weight: 600;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function markAsSent(guestId) {
    // Marcar como enviado
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
        guest.sent = true;
        saveData();
    }
    
    // Mostrar status
    const statusElement = document.getElementById(`status_${guestId}`);
    if (statusElement) {
        statusElement.style.display = 'block';
        statusElement.style.background = '#d4edda';
        statusElement.style.color = '#155724';
        statusElement.innerHTML = '✅ Enviado via WhatsApp';
    }
    
    // Atualizar contador
    updateSelectedCounter();
}

function updateSentCounter() {
    const sentButtons = document.querySelectorAll('.btn-send-single[disabled]');
    const totalMessages = document.querySelectorAll('.message-item').length;
    const sentCount = sentButtons.length;
    
    // Atualizar título do modal
    const modalTitle = document.querySelector('#messageModal h3');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fab fa-whatsapp"></i> Envio de Mensagens WhatsApp (${sentCount}/${totalMessages} enviadas)`;
    }
    
    // Atualizar contador de selecionados
    updateSelectedCounter();
}

// Função para selecionar todos os convidados
function selectAllGuests() {
    const checkboxes = document.querySelectorAll('.guest-checkbox');
    checkboxes.forEach(checkbox => {
        if (!checkbox.disabled) {
            checkbox.checked = true;
        }
    });
    updateSelectedCounter();
}

// Função para desmarcar todos os convidados
function deselectAllGuests() {
    const checkboxes = document.querySelectorAll('.guest-checkbox');
    checkboxes.forEach(checkbox => {
        if (!checkbox.disabled) {
            checkbox.checked = false;
        }
    });
    updateSelectedCounter();
}

// Função para enviar mensagens selecionadas
function sendSelectedMessages() {
    const selectedGuests = document.querySelectorAll('.guest-checkbox:checked');
    
    if (selectedGuests.length === 0) {
        alert('Por favor, selecione pelo menos um convidado.');
        return;
    }
    
    // Enviar mensagem para cada convidado selecionado
    selectedGuests.forEach(checkbox => {
        const guestId = checkbox.value;
        sendSingleMessage(guestId);
        
        // Pequeno delay entre envios para não sobrecarregar
        setTimeout(() => {
            // Desmarcar checkbox após envio
            checkbox.checked = false;
        }, 1000);
    });
    
    // Atualizar contador
    updateSelectedCounter();
}

// Função para atualizar contador de selecionados
function updateSelectedCounter() {
    const selectedCount = document.querySelectorAll('.guest-checkbox:checked:not(:disabled)').length;
    const totalCount = document.querySelectorAll('.guest-checkbox:not(:disabled)').length;
    
    const sendButton = document.querySelector('.btn-send-selected');
    if (sendButton) {
        sendButton.innerHTML = `<i class="fas fa-paper-plane"></i> Enviar Selecionados (${selectedCount}/${totalCount})`;
    }
}

function sendAllMessages() {
    if (!window.preparedMessages) return;
    
    // Abrir WhatsApp Web primeiro
    window.open('https://web.whatsapp.com/', '_blank');
    
    // Mostrar instruções
    alert('WhatsApp Web foi aberto. Agora você pode:\n\n1. Usar os botões "Enviar" individuais para cada convidado\n2. Ou copiar e colar as mensagens manualmente no WhatsApp Web');
}

function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.remove();
    }
    window.preparedMessages = null;
}

function completeSending() {
    document.getElementById('progressText').textContent = 'Todos os convites foram enviados!';
    document.getElementById('sendProgress').classList.add('hidden');
    
    // Atualizar dashboard
    updateDashboard();
    
    alert('Processo de envio concluído! Os convites foram preparados para envio.');
}

function sendTestMessage() {
    if (guests.length === 0) {
        alert('Por favor, carregue uma lista de convidados primeiro.');
        return;
    }
    
    const testGuest = guests[0];
    const messageTemplate = document.getElementById('messageTemplate').value;
    const confirmationLink = generateConfirmationLink(testGuest.id);
    
    let testMessage = messageTemplate
        .replace(/{nome}/g, testGuest.nome)
        .replace(/{evento}/g, eventData.name || 'Nome do Evento')
        .replace(/{data}/g, formatDate(eventData.date) || 'Data do evento')
        .replace(/{hora}/g, formatTime(eventData.date) || 'Hora do evento')
        .replace(/{local}/g, eventData.location || 'Local do evento')
        .replace(/{descricao}/g, eventData.description || 'Descrição do evento')
        .replace(/{link}/g, confirmationLink);
    
    // Verificar se API está configurada
    if (window.whatsappAPI && window.whatsappAPI.validateConfig()) {
        // Usar API do WhatsApp (com ou sem imagem)
        showNotification('🚀 Enviando via API WhatsApp...', 'info');
        
        window.whatsappAPI.sendMessage(testGuest.numero, testMessage, selectedImage)
            .then(() => {
                showNotification('✅ Mensagem enviada com sucesso!' + (selectedImage ? ' (com imagem)' : ''), 'success');
            })
            .catch((error) => {
                console.error('Erro ao enviar via API:', error);
                showNotification('❌ Erro na API: ' + error.message, 'error');
                
                // Fallback para WhatsApp Web
    const whatsappUrl = `https://wa.me/${testGuest.numero}?text=${encodeURIComponent(testMessage)}`;
    window.open(whatsappUrl, '_blank');
                showNotification('⚠️ Enviado via WhatsApp Web (sem imagem)', 'warning');
            });
    } else {
        // API não configurada - usar WhatsApp Web
        if (selectedImage) {
            showNotification('⚠️ API não configurada. Configure config.js para enviar com imagem!', 'warning');
        }
        
        const whatsappUrl = `https://wa.me/${testGuest.numero}?text=${encodeURIComponent(testMessage)}`;
        window.open(whatsappUrl, '_blank');
    }
}

// Funções de dashboard
function updateDashboard() {
    const total = guests.length;
    const confirmed = guests.filter(g => g.status === 'confirmed').length;
    const declined = guests.filter(g => g.status === 'declined').length;
    const pending = guests.filter(g => g.status === 'pending').length;
    
    console.log('📊 Atualizando dashboard:', { total, confirmed, declined, pending });
    
    document.getElementById('totalInvites').textContent = total;
    document.getElementById('confirmedInvites').textContent = confirmed;
    document.getElementById('declinedInvites').textContent = declined;
    document.getElementById('pendingInvites').textContent = pending;
    
    updateGuestsList();
}

// Função para limpar completamente o localStorage
function clearAllData() {
    try {
        console.log('🧹 Limpando todos os dados...');
        
        // Limpar todas as chaves relacionadas ao sistema
        const keysToRemove = [
            'guests', 'eventData', 'whatsappInvitesData', 'lastConfirmationUpdate',
            'selectedImage', 'lastConfirmationUpdate'
        ];
        
        // Remover chaves específicas
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Remover chaves de confirmação
        const allKeys = Object.keys(localStorage);
        const confirmationKeys = allKeys.filter(key => key.startsWith('confirmation_'));
        confirmationKeys.forEach(key => localStorage.removeItem(key));
        
        // Remover chaves de imagem
        const imageKeys = allKeys.filter(key => key.startsWith('img_'));
        imageKeys.forEach(key => localStorage.removeItem(key));
        
        // Limpar variáveis globais
        guests = [];
        eventData = {};
        selectedImage = null;
        
        console.log('✅ Todos os dados foram limpos');
        
        // Atualizar dashboard
        updateDashboard();
        
        // Limpar campos do formulário
        const eventNameEl = document.getElementById('eventName');
        const eventDateEl = document.getElementById('eventDate');
        const eventLocationEl = document.getElementById('eventLocation');
        const eventDescriptionEl = document.getElementById('eventDescription');
        
        if (eventNameEl) eventNameEl.value = '';
        if (eventDateEl) eventNameEl.value = '';
        if (eventLocationEl) eventLocationEl.value = '';
        if (eventDescriptionEl) eventDescriptionEl.value = '';
        
        // Mostrar notificação
        showNotification('Todos os dados foram limpos!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao limpar dados:', error);
        showNotification('Erro ao limpar dados', 'error');
    }
}

// Função para forçar atualização do dashboard (útil para testes locais)
function forceUpdateDashboard() {
    // Recarregar dados do localStorage
    loadStoredData();
    
    // Mostrar notificação
    showNotification('Dashboard atualizado!', 'success');
}

// Função para testar a API do WhatsApp
async function testWhatsAppAPI() {
    try {
        showNotification('🧪 Testando conexão com WhatsApp Business API...', 'info');
        
        if (window.whatsappAPI && window.whatsappAPI.testConnection) {
            const result = await window.whatsappAPI.testConnection();
            
            if (result) {
                showNotification('✅ API WhatsApp funcionando perfeitamente!', 'success');
            } else {
                showNotification('❌ Erro na API. Verifique config.js', 'error');
            }
        } else {
            showNotification('❌ API não configurada. Configure config.js primeiro', 'error');
        }
        
    } catch (error) {
        console.error('Erro no teste da API:', error);
        showNotification('❌ Erro no teste: ' + error.message, 'error');
    }
}

// Variável global para armazenar a imagem selecionada
// let selectedImage = null; // Garantir que está definida globalmente

// Função para lidar com seleção de imagem
function handleImageSelection(event) {
    const select = document.getElementById('inviteImage');
    const customUpload = document.getElementById('customImageUpload');
    const imagePreview = document.getElementById('imagePreview');
    
    if (select.value === 'custom') {
        customUpload.click();
    } else if (select.value) {
        // Imagem pré-definida
        selectedImage = select.value;
        console.log('🖼️ Imagem pré-definida selecionada:', selectedImage);
        showImagePreview(selectedImage);
        
        // Salvar no localStorage
        try {
            localStorage.setItem('selectedImage', selectedImage);
            console.log('💾 Imagem salva no localStorage');
        } catch (error) {
            console.error('❌ Erro ao salvar imagem no localStorage:', error);
        }
    } else {
        // Sem imagem
        selectedImage = null;
        imagePreview.style.display = 'none';
        console.log('🖼️ Nenhuma imagem selecionada');
        
        // Remover do localStorage
        try {
            localStorage.removeItem('selectedImage');
            console.log('🗑️ Imagem removida do localStorage');
        } catch (error) {
            console.error('❌ Erro ao remover imagem do localStorage:', error);
        }
    }
    
    updateInvitePreview();
}

// Função para lidar com upload de imagem customizada
function handleCustomImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Comprimir imagem antes de salvar
            selectedImage = compressImageSync(e.target.result);
            console.log('🖼️ Imagem carregada e comprimida');
            
            showImagePreview(selectedImage);
            updateInvitePreview();
        };
        reader.readAsDataURL(file);
    }
}

// Função para mostrar preview da imagem
function showImagePreview(imageSrc) {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    previewImg.src = imageSrc;
    preview.style.display = 'flex';
}

// Função para remover imagem
function removeImage() {
    selectedImage = null;
    document.getElementById('inviteImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    console.log('🗑️ Imagem removida');
    
    // Remover do localStorage
    try {
        localStorage.removeItem('selectedImage');
        console.log('🗑️ Imagem removida do localStorage');
    } catch (error) {
        console.error('❌ Erro ao remover imagem do localStorage:', error);
    }
    
    updateInvitePreview();
}

// Função para carregar imagem salva
function loadSavedImage() {
    try {
        const savedImage = localStorage.getItem('selectedImage');
        if (savedImage && savedImage !== 'null' && savedImage !== 'undefined') {
            selectedImage = savedImage;
            console.log('🔄 Imagem salva carregada do localStorage');
            console.log('🖼️ Tamanho da imagem:', selectedImage.length);
            
            // Verificar se é uma imagem customizada (base64)
            if (savedImage.startsWith('data:image/')) {
                document.getElementById('inviteImage').value = 'custom';
                showImagePreview(savedImage);
            } else {
                // Imagem pré-definida
                document.getElementById('inviteImage').value = savedImage;
                showImagePreview(savedImage);
            }
            
            console.log('✅ Imagem salva carregada com sucesso');
        } else {
            console.log('ℹ️ Nenhuma imagem salva encontrada');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar imagem salva:', error);
    }
}

// Função global para remover imagem (chamada pelo botão HTML)
window.removeImage = removeImage;

// Função para enviar todas as mensagens via API
async function sendAllMessagesViaAPI() {
    if (guests.length === 0) {
        showNotification('❌ Nenhum convidado carregado!', 'error');
        return;
    }
    
    if (!window.whatsappAPI || !window.whatsappAPI.validateConfig()) {
        showNotification('❌ API não configurada!', 'error');
        return;
    }
    
    // Preparar mensagens
    const messageTemplate = document.getElementById('messageTemplate').value;
    const messages = [];
    
    for (const guest of guests) {
        const confirmationLink = generateConfirmationLink(guest.id);
        
        let message = messageTemplate
            .replace(/{nome}/g, guest.nome)
            .replace(/{evento}/g, eventData.name)
            .replace(/{data}/g, formatDate(eventData.date))
            .replace(/{hora}/g, formatTime(eventData.date))
            .replace(/{local}/g, eventData.location)
            .replace(/{descricao}/g, eventData.description)
            .replace(/{link}/g, confirmationLink);
        
        messages.push({
            guest: guest,
            phone: guest.numero,
            text: message,
            imageUrl: selectedImage
        });
    }
    
    // Mostrar progresso
    showSendProgress();
    
    try {
        // Enviar mensagens via API
        const results = await window.whatsappAPI.sendBulkMessages(messages);
        
        // Analisar resultados
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        // Esconder progresso
        document.getElementById('sendProgress').classList.add('hidden');
        
        // Mostrar relatório
        showNotification(
            `✅ Envio concluído! ${successCount} enviadas, ${errorCount} erros`, 
            successCount > 0 ? 'success' : 'error'
        );
        
        // Atualizar dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('Erro no envio em massa:', error);
        document.getElementById('sendProgress').classList.add('hidden');
        showNotification('❌ Erro no envio: ' + error.message, 'error');
    }
}

function updateGuestsList() {
    const container = document.querySelector('.list-container');
    
    console.log('📋 Atualizando lista de convidados:', guests);
    
    if (guests.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Nenhum convidado carregado</p>';
        return;
    }
    
    container.innerHTML = guests.map(guest => `
        <div class="guest-item">
            <div class="guest-info">
                <div class="guest-name">${guest.nome}</div>
                <div class="guest-phone">${guest.numero}</div>
            </div>
            <div class="guest-status status-${guest.status}">
                ${getStatusText(guest.status)}
            </div>
        </div>
    `).join('');
    
    console.log('✅ Lista de convidados atualizada');
}

function getStatusText(status) {
    switch (status) {
        case 'confirmed': return 'Confirmado';
        case 'declined': return 'Não Confirmado';
        case 'pending': return 'Pendente';
        default: return 'Pendente';
    }
}

// Funções de confirmação
function handleConfirmation(guestId, status) {
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
        guest.status = status;
        saveData();
        updateDashboard();
        
        // Mostrar mensagem de confirmação
        const message = status === 'confirmed' 
            ? 'Presença confirmada! Obrigado!' 
            : 'Entendido. Obrigado pela resposta!';
        
        showConfirmationMessage(message);
    }
}

        // Função para confirmar presença (escopo global)
        function confirmPresence(status) {
            try {
                const guestId = new URLSearchParams(window.location.search).get('g') || new URLSearchParams(window.location.search).get('guest');
                
                console.log('✅ Confirmando presença:', { guestId, status });
                
                // SOLUÇÃO PARA VERCEL: Usar uma chave única para cada confirmação
                const confirmationKey = `confirmation_${guestId}_${Date.now()}`;
                const confirmationData = {
                    guestId: guestId,
                    status: status,
                    timestamp: Date.now(),
                    confirmed: true
                };
                
                // Salvar confirmação no localStorage
                localStorage.setItem(confirmationKey, JSON.stringify(confirmationData));
                
                // Salvar também na chave principal para compatibilidade
                localStorage.setItem('lastConfirmationUpdate', JSON.stringify(confirmationData));
                
                console.log('💾 Confirmação salva:', confirmationData);
                
                // Tentar notificar a aplicação principal
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'confirmation_update',
                        guestId: guestId,
                        status: status,
                        timestamp: Date.now()
                    }, '*');
                    console.log('📤 Mensagem enviada para aplicação principal');
                }
                
                // Mostrar mensagem de confirmação
                showConfirmationMessage(status);
                
                // Fechar a janela após 3 segundos
                setTimeout(() => {
                    if (window.opener) {
                        window.close();
                    }
                }, 3000);
                
            } catch (error) {
                console.error('Erro ao confirmar presença:', error);
                alert('Erro ao confirmar presença. Tente novamente.');
            }
        }

        // Função para mostrar mensagem de confirmação
        function showConfirmationMessage(status) {
            const mainContent = document.querySelector('.invite-container');
            const statusText = status === 'confirmed' ? 'Presença Confirmada!' : 'Presença Declinada';
            const statusIcon = status === 'confirmed' ? '✅' : '❌';
            const statusColor = status === 'confirmed' ? '#4CAF50' : '#f44336';
            
            mainContent.innerHTML = `
                <div style="
                    text-align: center;
                    padding: 60px 30px;
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                    border-radius: 20px;
                    color: white;
                    animation: spectacularEntry 0.8s ease-out;
                ">
                    <div style="
                        font-size: 4em;
                        margin-bottom: 20px;
                        animation: iconBounce 1s ease-out 0.3s both;
                    ">
                        ${statusIcon}
                    </div>
                    <h1 style="
                        font-size: 2.5em;
                        margin-bottom: 20px;
                        color: ${statusColor};
                        animation: textSlideIn 0.8s ease-out 0.5s both;
                    ">
                        ${statusText}
                    </h1>
                    <p style="
                        font-size: 1.2em;
                        margin-bottom: 30px;
                        opacity: 0.9;
                        animation: textSlideIn 0.8s ease-out 0.7s both;
                    ">
                        Obrigado por confirmar sua presença!
                    </p>
                    <button onclick="window.close()" style="
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        padding: 15px 40px;
                        border-radius: 50px;
                        font-size: 1.1em;
                        cursor: pointer;
                        animation: buttonAppear 0.8s ease-out 0.9s both;
                    ">
                        Fechar
                    </button>
                </div>
            `;
        }

        // Funções utilitárias
        function formatDate(dateString) {
            if (!dateString) return 'Data não definida';
            
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        function formatTime(dateString) {
            if (!dateString) return 'Hora não definida';
            
            const date = new Date(dateString);
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function getNextSaturday() {
            const today = new Date();
            const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
            const nextSaturday = new Date(today);
            nextSaturday.setDate(today.getDate() + daysUntilSaturday);
            nextSaturday.setHours(19, 0, 0, 0); // 19:00
            
            return nextSaturday.toISOString().slice(0, 16);
        }

        function showSendProgress() {
            document.getElementById('sendProgress').classList.remove('hidden');
            document.getElementById('progressFill').style.width = '0%';
            document.getElementById('progressText').textContent = 'Preparando envio...';
        }

        // Função para salvar dados
        function saveData() {
            try {
                localStorage.setItem('guests', JSON.stringify(guests));
                localStorage.setItem('eventData', JSON.stringify(eventData));
                
                // Limpar imagens antigas do localStorage (manter apenas as últimas 5)
                cleanupOldImages();
            } catch (error) {
                console.error('❌ Erro ao salvar dados:', error);
            }
        }

        // Função para limpar imagens antigas do localStorage
        function cleanupOldImages() {
            try {
                const keys = Object.keys(localStorage);
                const imageKeys = keys.filter(key => key.startsWith('img_'));
                
                if (imageKeys.length > 5) {
                    // Manter apenas as 5 imagens mais recentes
                    const sortedKeys = imageKeys.sort((a, b) => {
                        const aTime = localStorage.getItem(a + '_time') || 0;
                        const bTime = localStorage.getItem(b + '_time') || 0;
                        return bTime - aTime;
                    });
                    
                    // Remover imagens antigas
                    sortedKeys.slice(5).forEach(key => {
                        localStorage.removeItem(key);
                        localStorage.removeItem(key + '_time');
                        console.log('🗑️ Imagem antiga removida:', key);
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao limpar imagens antigas:', error);
            }
        }

        // Função para carregar dados salvos
        function loadStoredData() {
            try {
                // LIMPAR DADOS ANTIGOS/FANTASMAS
                console.log('🧹 Limpando dados antigos...');
                
                // Verificar se há dados válidos
                const savedGuests = localStorage.getItem('guests');
                const savedEventData = localStorage.getItem('eventData');
                
                // Se não há dados válidos, limpar tudo
                if (!savedGuests || !savedEventData) {
                    console.log('🗑️ Dados inválidos encontrados, limpando...');
                    localStorage.removeItem('guests');
                    localStorage.removeItem('eventData');
                    localStorage.removeItem('whatsappInvitesData');
                    localStorage.removeItem('lastConfirmationUpdate');
                    
                    // Limpar variáveis globais
                    guests = [];
                    eventData = {};
                    
                    console.log('✅ Dados limpos, iniciando com lista vazia');
                    updateDashboard();
                    return;
                }
                
                // Carregar dados válidos
                try {
                    guests = JSON.parse(savedGuests);
                    eventData = JSON.parse(savedEventData);
                    
                    // Validar se os dados são válidos
                    if (!Array.isArray(guests) || guests.length === 0) {
                        console.log('⚠️ Lista de convidados inválida, limpando...');
                        guests = [];
                        localStorage.removeItem('guests');
                    }
                    
                    if (!eventData || typeof eventData !== 'object') {
                        console.log('⚠️ Dados do evento inválidos, limpando...');
                        eventData = {};
                        localStorage.removeItem('eventData');
                    }
                    
                    console.log('📊 Dados válidos carregados:', { 
                        guestsCount: guests.length, 
                        hasEventData: !!eventData.name 
                    });
                    
                    // Preencher campos do evento se existirem
                    if (eventData.name) {
                        const eventNameEl = document.getElementById('eventName');
                        const eventDateEl = document.getElementById('eventDate');
                        const eventLocationEl = document.getElementById('eventLocation');
                        const eventDescriptionEl = document.getElementById('eventDescription');
                        
                        if (eventNameEl) eventNameEl.value = eventData.name || '';
                        if (eventDateEl) eventDateEl.value = eventData.date || '';
                        if (eventLocationEl) eventLocationEl.value = eventData.location || '';
                        if (eventDescriptionEl) eventDescriptionEl.value = eventData.description || '';
                    }
                    
                } catch (parseError) {
                    console.error('❌ Erro ao fazer parse dos dados:', parseError);
                    // Limpar dados corrompidos
                    localStorage.removeItem('guests');
                    localStorage.removeItem('eventData');
                    guests = [];
                    eventData = {};
                }
                
                updateDashboard();
                
            } catch (error) {
                console.error('❌ Erro ao carregar dados:', error);
                // Em caso de erro, limpar tudo
                guests = [];
                eventData = {};
                updateDashboard();
            }
        }

        // Carregar dados quando a página carregar
        document.addEventListener('DOMContentLoaded', () => {
            loadInviteData();
        });

// Função para verificar atualizações do localStorage
function checkForUpdates() {
    try {
        console.log('🔍 Verificando atualizações...');
        
        // Verificar se há atualizações de confirmação
        const lastUpdate = localStorage.getItem('lastConfirmationUpdate');
        if (lastUpdate) {
            try {
                const updateData = JSON.parse(lastUpdate);
                console.log('📊 Dados de confirmação encontrados:', updateData);
                
                // Verificar se a confirmação é recente (últimos 30 segundos)
                const isRecent = (Date.now() - updateData.timestamp) < 30000;
                
                if (isRecent && updateData.confirmed) {
                    console.log('✅ Confirmação recente encontrada, atualizando dashboard...');
                    
                    // Atualizar o convidado na lista local
                    const guest = guests.find(g => g.id === updateData.guestId);
                    if (guest) {
                        const oldStatus = guest.status;
                        guest.status = updateData.status;
                        
                        console.log(`🔄 Status atualizado: ${guest.nome} ${oldStatus} → ${updateData.status}`);
                        
                        // Salvar dados atualizados
                        saveData();
                        
                        // Atualizar dashboard
                        updateDashboard();
                        
                        // Mostrar notificação
                        showNotification(
                            `${guest.nome} ${updateData.status === 'confirmed' ? 'confirmou' : 'não confirmou'} presença!`, 
                            'success'
                        );
                        
                        // Limpar confirmação processada
                        localStorage.removeItem('lastConfirmationUpdate');
                        console.log('✅ Confirmação processada e removida');
                    } else {
                        console.log('⚠️ Convidado não encontrado na lista local:', updateData.guestId);
                    }
                } else if (!isRecent) {
                    console.log('⏰ Confirmação muito antiga, removendo...');
                    localStorage.removeItem('lastConfirmationUpdate');
                }
                
            } catch (parseError) {
                console.error('❌ Erro ao processar dados de confirmação:', parseError);
                localStorage.removeItem('lastConfirmationUpdate');
            }
        }
        
        // Verificar se há outras confirmações salvas
        const keys = Object.keys(localStorage);
        const confirmationKeys = keys.filter(key => key.startsWith('confirmation_'));
        
        if (confirmationKeys.length > 0) {
            console.log(`🔍 Encontradas ${confirmationKeys.length} confirmações pendentes`);
            
            confirmationKeys.forEach(key => {
                try {
                    const confirmationData = JSON.parse(localStorage.getItem(key));
                    const isRecent = (Date.now() - confirmationData.timestamp) < 30000;
                    
                    if (isRecent && confirmationData.confirmed) {
                        // Processar confirmação
                        const guest = guests.find(g => g.id === confirmationData.guestId);
                        if (guest) {
                            guest.status = confirmationData.status;
                            console.log(`🔄 Processando confirmação: ${guest.nome} → ${confirmationData.status}`);
                        }
                        
                        // Remover confirmação processada
                        localStorage.removeItem(key);
                    } else if (!isRecent) {
                        // Remover confirmações antigas
                        localStorage.removeItem(key);
                        console.log(`🗑️ Confirmação antiga removida: ${key}`);
                    }
                } catch (error) {
                    console.error(`❌ Erro ao processar confirmação ${key}:`, error);
                    localStorage.removeItem(key);
                }
            });
            
            // Salvar e atualizar se houve mudanças
            if (confirmationKeys.some(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    return data && data.confirmed && (Date.now() - data.timestamp) < 30000;
                } catch {
                    return false;
                }
            })) {
                saveData();
                updateDashboard();
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar atualizações:', error);
    }
}

// Inicializar verificação de confirmação
checkConfirmationPage(); 