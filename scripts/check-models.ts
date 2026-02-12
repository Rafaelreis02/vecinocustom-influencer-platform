
async function listModels() {
  const apiKey = "AIzaSyB3snP6pqYkq3iBN5q-bEZITY7wrsLB70s";
  console.log('📡 A consultar a Google AI para listar modelos disponíveis...');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('✅ Modelos disponíveis para a tua chave:');
      const models = data.models
        .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
      
      models.forEach((name: string) => console.log(`- ${name}`));
      
      // Procurar o mais parecido com "Gemini 3" ou o mais recente
      const latest = models.find((m: string) => m.includes('2.0') || m.includes('experimental')) || models[0];
      console.log(`\n💡 Recomendação para "Gemini 3 Flash": ${latest}`);
    } else {
      console.log('❌ Erro na resposta da Google:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Erro na ligação:', error);
  }
}

listModels();
