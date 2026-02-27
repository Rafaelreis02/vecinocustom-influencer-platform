-- Templates de Email Modernos e Simpáticos para VecinoCustom
-- Inserir na base de dados

-- Limpar templates antigos se existirem
DELETE FROM "email_templates" WHERE key LIKE 'STEP_%';

-- STEP 1: Partnership (com valor)
INSERT INTO "email_templates" (id, key, name, subject, body, step, isActive, hasValue) VALUES
(gen_random_uuid(), 'STEP_1_WITH_VALUE', 'Step 1: Partnership - Com Valor', '✨ A tua proposta está pronta, {{nome}}!', 
'Oii {{nome}}! 👋

Temos uma proposta super fixe para ti! 💎

Queremos oferecer-te uma peça personalizada da VecinoCustom + {{valor}}€ pela tua criatividade! 😍

E ainda tens um cupom exclusivo para a tua comunidade: 10% desconto e tu ganhas 20% comissão em cada venda! 🎉

Tudo o que precisamos é de um vídeo e uma foto a mostrar a tua peça nas redes! 📱✨

Queres aceitar? Clica aqui 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Beijinhos,
Equipa VecinoCustom 💙

---
Dúvidas? Responde a este email ou fala connosco no WhatsApp! 📲', 
1, true, true);

-- STEP 1: Partnership (sem valor - só comissão)
INSERT INTO "email_templates" (id, key, name, subject, body, step, isActive, hasValue) VALUES
(gen_random_uuid(), 'STEP_1_NO_VALUE', 'Step 1: Partnership - Sem Valor', '✨ Tens uma parceria à tua espera, {{nome}}!', 
'Oii {{nome}}! 👋

Temos uma oportunidade incrível para ti! 💎

Queremos oferecer-te uma peça personalizada da VecinoCustom e ainda criar um cupom exclusivo para ti! 🎁

A tua comunidade tem 10% desconto e TU ganhas 20% comissão em CADA venda! 💰✨

Só precisamos de um vídeo e uma foto com a tua peça! 📱

Topas? Clica aqui para aceitar 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Beijinhos,
Equipa VecinoCustom 💙

---
Dúvidas? Responde a este email ou manda WhatsApp! 📲', 
1, true, false);

-- STEP 2: Shipping
INSERT INTO "email_templates" (id, key, name, subject, body, step, isActive, hasValue) VALUES
(gen_random_uuid(), 'STEP_2', 'Step 2: Shipping', '📦 Precisamos da tua morada, {{nome}}!', 
'Yaaay {{nome}}! 🎉

A tua proposta foi aceite! Agora precisamos da tua morada para enviarmos a tua peça personalizada! 📦💎

Clica no link abaixo e preenche:
• A tua morada completa 🏠
• 3 sugestões de peças que gostavas de receber ✨

É super rápido! 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Mal recebamos, preparamos tudo com muito carinho! 💙

Beijinhos,
Equipa VecinoCustom

---
Qualquer dúvida estamos aqui! 📲', 
2, true, true);

-- STEP 3: Preparing
INSERT INTO "email_templates" (id, key, name, subject, body, step, isActive, hasValue) VALUES
(gen_random_uuid(), 'STEP_3', 'Step 3: Preparing', '🔥 Estamos a preparar a tua peça, {{nome}}!', 
'Oii {{nome}}! 💎

As tuas sugestões foram aceites e já estamos a preparar a tua peça personalizada! 🔥

Vais adorar o resultado! ✨

Em breve enviamos e dámos-te o código de tracking para acompanhares! 📦

Fica atenta ao teu email! 😉

Beijinhos,
Equipa VecinoCustom 💙

---
Dúvidas? Contacta-nos! 📲', 
3, true, true);

-- STEP 4: Contract
INSERT INTO "email_templates" (id, key, name, subject, body, step, isActive, hasValue) VALUES
(gen_random_uuid(), 'STEP_4', 'Step 4: Contract', '📝 Assina o contrato e é tudo teu, {{nome}}!', 
'Hey {{nome}}! 👋

A tua peça já está a caminho! 🎁📦

Antes de chegar, precisamos que assines o contrato digital. É super rápido e seguro! ✅

Clica aqui 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Assim que receberes a peça, tens 5 dias para criares o conteúdo e partilhares! 📱✨

Qualquer dúvida estamos aqui para ajudar! 💙

Beijinhos,
Equipa VecinoCustom

---
Perguntas? Responde a este email! 📧', 
4, true, true);

-- STEP 5: Shipped
INSERT INTO "email_templates" (id, key, name, subject, body, step, isActive, hasValue) VALUES
(gen_random_uuid(), 'STEP_5', 'Step 5: Shipped', '🚀 Já foi! A tua peça está a caminho, {{nome}}!', 
'Oii {{nome}}! 🎉

A tua peça personalizada já foi enviada! 📦💎

Podes acompanhar aqui: {{tracking_url}}

Assim que receberes:
1. Grava um vídeo criativo com a peça 📱
2. Tira uma foto linda 📸
3. Publica e envia-nos para aprovação ✅

Tens 5 dias após receber! ✨

O teu cupom {{cupom}} já está ativo para a tua comunidade! 🎁

Dúvidas? Estamos aqui! 💙

Beijinhos,
Equipa VecinoCustom

---
Boa sorte! Vais arrasar! 🌟', 
5, true, true);

-- Template genérico fallback
INSERT INTO "email_templates" (id, key, name, subject, body, step, isActive, hasValue) VALUES
(gen_random_uuid(), 'STEP_1', 'Step 1: Partnership (Genérico)', '✨ Nova proposta da VecinoCustom!', 
'Oii! 👋

Temos uma proposta especial para ti! 💎

Clica aqui para veres todos os detalhes e aceitares: 👇
https://vecinocustom-influencer-platform.vercel.app/portal/{{portalToken}}

Beijinhos,
Equipa VecinoCustom 💙', 
1, true, true);
