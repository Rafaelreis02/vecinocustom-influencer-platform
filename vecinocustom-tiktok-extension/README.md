# VecinoCustom TikTok Helper Extension 🎬

Extensão Chrome para adicionar vídeos TikTok à plataforma VecinoCustom com um clique!

## ✨ Funcionalidades

- 🤖 **Auto-detecção**: Lê automaticamente views, likes, comments do TikTok
- 🎯 **Um clique**: Botão flutuante na página do TikTok
- 📊 **Selecionar campanha**: Escolhe a campanha diretamente
- 💰 **Adicionar custo**: Define quanto pagaste pelo vídeo
- 🚀 **Envio automático**: Guarda direto na plataforma

## 📦 Instalação

### 1. Carregar a Extensão

1. Abre Chrome
2. Vai a: `chrome://extensions`
3. Ativa o **"Modo de programador"** (toggle no canto superior direito)
4. Clica em **"Carregar sem compactação"** (Load unpacked)
5. Seleciona a pasta `vecinocustom-tiktok-extension`
6. Pronto! ✅

### 2. Ícones (Opcional)

A extensão precisa de 3 ícones. Por agora, vais ver um ícone de puzzle padrão.

**Para adicionar ícones personalizados:**
- Cria 3 imagens PNG (16x16, 48x48, 128x128)
- Nome: `icon16.png`, `icon48.png`, `icon128.png`
- Guarda na pasta da extensão
- Recarrega a extensão em `chrome://extensions`

**Sugestão de design:**
- Logo roxo/gradiente (#667eea → #764ba2)
- Símbolo: 🎬 ou play button
- Ou usa qualquer logo da VecinoCustom

**Download de ícones temporários:**
Podes usar [favicon.io](https://favicon.io) ou [Canva](https://canva.com) para criar rápido.

Por agora, a extensão funciona sem os ícones - apenas fica com o ícone de puzzle padrão do Chrome.

## 🎯 Como Usar

1. **Abre um vídeo TikTok** (https://www.tiktok.com/@user/video/123...)
2. Espera 2 segundos (botão roxo aparece no canto inferior direito)
3. **Clica no botão** "Adicionar ao VecinoCustom"
4. Abre o **popup da extensão** (clica no ícone ao lado da barra de endereço)
5. **Vê os dados** extraídos automaticamente
6. **Seleciona a campanha**
7. **Adiciona o custo** (opcional)
8. **Clica "Adicionar Vídeo"**
9. ✅ Feito!

## 🔧 Configuração

Por padrão, a extensão usa:
```
https://vecinocustom-influencer-platform.vercel.app
```

Para mudar (ex: localhost para desenvolvimento):
1. Abre o popup
2. Clica "⚙️ Configurações"
3. Mete o novo URL (ex: `http://localhost:3000`)

## 🐛 Troubleshooting

### "Nenhum dado extraído"
- Certifica-te que estás numa página de vídeo TikTok (URL tem `/video/`)
- Espera a página carregar completamente
- Recarrega a página e tenta de novo

### "Erro ao carregar campanhas"
- Verifica se a plataforma está online
- Verifica se tens campanhas ATIVAS criadas

### Botão não aparece
- Recarrega a página do TikTok (F5)
- Verifica se a extensão está ativada em `chrome://extensions`

### CORS Error na consola
- Normal! A extensão tem permissões especiais
- Se persistir, adiciona a URL no manifest.json

## 📝 Notas Técnicas

- **Manifest V3** (mais recente)
- **Content Script**: Injeta botão nas páginas TikTok
- **Popup**: Interface para configurar e enviar
- **Storage API**: Guarda dados extraídos temporariamente
- **Fetch API**: Comunica com a tua plataforma

## 🎨 Personalização

Podes editar:
- `popup.html` - Layout e design
- `content.js` - Lógica de extração e botão
- `popup.js` - Lógica do formulário
- `manifest.json` - Permissões e configurações

## 🚀 Próximos Passos

Possíveis melhorias:
- [ ] Auto-atualizar métricas diariamente
- [ ] Suporte para Instagram Reels
- [ ] Keyboard shortcuts
- [ ] Notificações quando vídeo atinge X views
- [ ] Export batch de vídeos

---

**Criado com 💜 para VecinoCustom**
