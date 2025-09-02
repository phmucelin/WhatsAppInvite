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
    updateInvitePreview();
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
                    `${event.data.guestName} ${event.data.status === 'confirmed' ? 'confirmou' : 'não confirmou'} presença!`, 
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
    fetch('Untitled spreadsheet - Sheet1.csv')
        .then(response => response.text())
        .then(data => {
            parseCSVData(data);
            updateDashboard();
        })
        .catch(error => {
            console.log('Arquivo CSV padrão não encontrado, você pode fazer upload de um arquivo.');
        });
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            parseCSVData(e.target.result);
            updateDashboard();
        };
        reader.readAsText(file);
    }
}

function parseCSVData(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
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
    
    displayGuestsPreview();
    saveData();
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

// Função para comprimir imagem automaticamente
function compressImage(imageDataUrl, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calcular proporção para manter aspect ratio
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                const newWidth = img.width * ratio;
                const newHeight = img.height * ratio;
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // Comprimir com qualidade especificada
                const compressedImage = canvas.toDataURL('image/jpeg', quality);
                
                console.log('🖼️ Imagem comprimida:', {
                    original: imageDataUrl.length,
                    compressed: compressedImage.length,
                    reduction: Math.round((1 - compressedImage.length / imageDataUrl.length) * 100) + '%'
                });
                
                resolve(compressedImage);
            } catch (error) {
                console.error('❌ Erro ao comprimir imagem:', error);
                reject(error);
            }
        };
        
        img.onerror = function() {
            reject(new Error('Erro ao carregar imagem para compressão'));
        };
        
        img.src = imageDataUrl;
    });
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
    
    // SEMPRE incluir dados do evento na URL para mobile
    let eventParams = '';
    eventParams += `&eventName=${encodeURIComponent(eventData.name || 'Evento')}`;
    eventParams += `&eventDate=${encodeURIComponent(eventData.date || new Date().toISOString())}`;
    eventParams += `&eventLocation=${encodeURIComponent(eventData.location || 'Local do evento')}`;
    eventParams += `&eventDescription=${encodeURIComponent(eventData.description || 'Descrição do evento')}`;
    
    // Adicionar nome do convidado se disponível
    let nameParam = '';
    if (guestId) {
        const guest = guests.find(g => g.id === guestId);
        if (guest && guest.nome) {
            nameParam = `&name=${encodeURIComponent(guest.nome)}`;
        }
    }
    
    // SOLUÇÃO FUNCIONAL: Usar localStorage com ID único
    let imageParam = '';
    if (selectedImage) {
        try {
            // Gerar ID único para a imagem
            const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Salvar imagem no localStorage com ID único
            localStorage.setItem('inviteImage_' + imageId, selectedImage);
            console.log('💾 Imagem salva com ID:', imageId);
            
            // Incluir apenas o ID na URL
            imageParam = `&imageId=${imageId}`;
            
        } catch (error) {
            console.error('❌ Erro ao salvar imagem:', error);
            // Se der erro, não incluir imagem
        }
    }
    
    if (guestId) {
        // Usar a nova página de convite personalizada
        const finalUrl = `${baseUrl}?event=${encodedEvent}&guest=${encodedGuest}${nameParam}${eventParams}${imageParam}&t=${timestamp}`;
        return finalUrl;
    }
    return `${baseUrl}?event=${encodedEvent}&t=${timestamp}`;
}

function generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    
    document.getElementById('totalInvites').textContent = total;
    document.getElementById('confirmedInvites').textContent = confirmed;
    document.getElementById('declinedInvites').textContent = declined;
    document.getElementById('pendingInvites').textContent = pending;
    
    updateGuestsList();
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
            selectedImage = e.target.result;
            console.log('🖼️ Imagem customizada carregada:', selectedImage.substring(0, 100) + '...');
            console.log('🖼️ Tamanho da imagem:', selectedImage.length);
            
            showImagePreview(selectedImage);
            
            // Salvar no localStorage
            try {
                localStorage.setItem('selectedImage', selectedImage);
                console.log('💾 Imagem customizada salva no localStorage');
            } catch (error) {
                console.error('❌ Erro ao salvar imagem customizada no localStorage:', error);
            }
            
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

function showConfirmationMessage(message) {
    // Criar overlay de confirmação
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
    `;
    
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 15px;
        text-align: center;
        max-width: 400px;
        margin: 20px;
    `;
    
    messageBox.innerHTML = `
        <h3 style="color: #667eea; margin-bottom: 20px;">Confirmação Recebida!</h3>
        <p style="font-size: 1.1rem; margin-bottom: 20px;">${message}</p>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: #667eea; color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer;">
            Fechar
        </button>
    `;
    
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
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

// Funções de armazenamento
function saveData() {
    const data = {
        guests: guests,
        eventData: eventData,
        timestamp: Date.now()
    };
    localStorage.setItem('whatsappInvitesData', JSON.stringify(data));
}

// Verificar atualizações do localStorage (backup para casos onde postMessage não funciona)
function checkForUpdates() {
    const stored = localStorage.getItem('whatsappInvitesData');
    const lastUpdate = localStorage.getItem('lastConfirmationUpdate');
    
    if (stored) {
        try {
            const data = JSON.parse(stored);
            const storedGuests = data.guests || [];
            
            // Verificar se houve mudanças nos status dos convidados
            let hasChanges = false;
            
            storedGuests.forEach(storedGuest => {
                const localGuest = guests.find(g => g.id === storedGuest.id);
                if (localGuest && localGuest.status !== storedGuest.status) {
                    // Atualizar o convidado local
                    localGuest.status = storedGuest.status;
                    hasChanges = true;
                    
                    // Mostrar notificação (apenas se não foi mostrada via postMessage)
                    showNotification(
                        `${localGuest.nome} ${storedGuest.status === 'confirmed' ? 'confirmou' : 'não confirmou'} presença!`, 
                        'success'
                    );
                }
            });
            
            // Se houve mudanças, atualizar o dashboard
            if (hasChanges) {
                updateDashboard();
            }
            
            // Verificar atualizações recentes (últimos 10 segundos)
            if (lastUpdate) {
                const updateData = JSON.parse(lastUpdate);
                const timeDiff = Date.now() - updateData.timestamp;
                
                if (timeDiff < 10000) { // 10 segundos
                    const guest = guests.find(g => g.id === updateData.guestId);
                    if (guest && guest.status !== updateData.status) {
                        guest.status = updateData.status;
                        updateDashboard();
                        
                        // Não mostrar notificação duplicada se já foi mostrada via postMessage
                        console.log(`Atualização detectada: ${guest.nome} - ${updateData.status}`);
                    }
                }
            }
            
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
        }
    }
}

function loadStoredData() {
    const stored = localStorage.getItem('whatsappInvitesData');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            guests = data.guests || [];
            eventData = data.eventData || {};
            
            // Restaurar valores dos campos
            if (eventData.name) document.getElementById('eventName').value = eventData.name;
            if (eventData.date) document.getElementById('eventDate').value = eventData.date;
            if (eventData.location) document.getElementById('eventLocation').value = eventData.location;
            if (eventData.description) document.getElementById('eventDescription').value = eventData.description;
            
            updateDashboard();
            updateInvitePreview();
        } catch (error) {
            console.error('Erro ao carregar dados salvos:', error);
        }
    }
}

// Verificar se é uma página de confirmação
function checkConfirmationPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const isConfirmation = urlParams.get('confirm');
    const eventId = urlParams.get('event');
    const guestId = urlParams.get('guest');
    const status = urlParams.get('status');
    
    if (isConfirmation && eventId) {
        showConfirmationPage(eventId, guestId, status);
    }
}

function showConfirmationPage(eventId, guestId, status) {
    // Limpar página atual
    document.body.innerHTML = '';
    
    // Carregar dados do evento para mostrar informações
    const stored = localStorage.getItem('whatsappInvitesData');
    let eventInfo = { name: 'Evento', date: 'Data não definida', location: 'Local não definido' };
    
    if (stored) {
        try {
            const data = JSON.parse(stored);
            eventInfo = data.eventData || eventInfo;
        } catch (error) {
            console.error('Erro ao carregar dados do evento:', error);
        }
    }
    
    // Criar página de confirmação
    const confirmationPage = `
        <div style="
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            ">
                <h2 style="color: #667eea; margin-bottom: 20px;">Confirmação de Presença</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">${eventInfo.name}</h3>
                    <p style="margin: 5px 0; color: #666;">📅 ${formatDate(eventInfo.date)}</p>
                    <p style="margin: 5px 0; color: #666;">📍 ${eventInfo.location}</p>
                </div>
                <p style="margin-bottom: 30px; font-size: 1.1rem;">
                    Você confirma sua presença neste evento?
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="confirmPresence('${guestId}', 'confirmed')" 
                            style="
                                background: #28a745;
                                color: white;
                                border: none;
                                padding: 15px 30px;
                                border-radius: 10px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s ease;
                            "
                            onmouseover="this.style.transform='scale(1.05)'"
                            onmouseout="this.style.transform='scale(1)'">
                        ✅ Confirmar Presença
                    </button>
                    <button onclick="confirmPresence('${guestId}', 'declined')" 
                            style="
                                background: #dc3545;
                                color: white;
                                border: none;
                                padding: 15px 30px;
                                border-radius: 10px;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s ease;
                            "
                            onmouseover="this.style.transform='scale(1.05)'"
                            onmouseout="this.style.transform='scale(1)'">
                        ❌ Não Posso Ir
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.innerHTML = confirmationPage;
}

function confirmPresence(guestId, status) {
    // Carregar dados salvos
    const stored = localStorage.getItem('whatsappInvitesData');
    if (stored) {
        const data = JSON.parse(stored);
        const guests = data.guests || [];
        
        // Encontrar e atualizar o convidado
        const guest = guests.find(g => g.id === guestId);
        if (guest) {
            guest.status = status;
            
            // Salvar dados atualizados
            data.guests = guests;
            localStorage.setItem('whatsappInvitesData', JSON.stringify(data));
            
            // Mostrar confirmação
            const isConfirmed = status === 'confirmed';
            const message = isConfirmed 
                ? 'Presença confirmada! Obrigado!' 
                : 'Entendido. Obrigado pela resposta!';
            
            const icon = isConfirmed ? '✅' : '❌';
            const color = isConfirmed ? '#28a745' : '#dc3545';
            
            document.body.innerHTML = `
                <div style="
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                ">
                    <div style="
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        text-align: center;
                        max-width: 400px;
                        width: 100%;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                        animation: fadeIn 0.5s ease-in;
                    ">
                        <div style="
                            font-size: 4rem;
                            margin-bottom: 20px;
                            animation: bounce 1s ease-in-out;
                        ">
                            ${icon}
                    </div>
                        <h3 style="color: ${color}; margin-bottom: 20px; font-size: 1.5rem;">
                            ${isConfirmed ? 'Presença Confirmada!' : 'Resposta Registrada!'}
                        </h3>
                        <p style="font-size: 1.1rem; margin-bottom: 20px; color: #333;">
                            ${message}
                        </p>
                        <p style="color: #666; font-size: 0.9rem; margin-bottom: 20px;">
                            Você pode fechar esta página.
                        </p>
                        <button onclick="window.close()" 
                                style="
                                    background: #667eea;
                                    color: white;
                                    border: none;
                                    padding: 10px 20px;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-weight: 600;
                                ">
                            Fechar Página
                        </button>
                </div>
                </div>
                
                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes bounce {
                        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                        40% { transform: translateY(-10px); }
                        60% { transform: translateY(-5px); }
                    }
                </style>
            `;
            
            // Notificar o usuário principal (se estiver na mesma sessão)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'confirmation_update',
                    guestId: guestId,
                    status: status,
                    guestName: guest.nome
                }, '*');
            }
            
            // Para funcionar localmente, também salvar um timestamp de atualização
            const updateData = {
                guestId: guestId,
                status: status,
                timestamp: Date.now()
            };
            localStorage.setItem('lastConfirmationUpdate', JSON.stringify(updateData));
        }
    }
}

// Inicializar verificação de confirmação
checkConfirmationPage(); 