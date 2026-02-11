# Apify TikTok Scraper - Especificação Completa

**Actor ID:** `GdWCkxBtKWOsKjdch`  
**Documentação:** https://apify.com/clockworks/free-tiktok-scraper

## Tipos de Query

### 1. PROFILES (o que usamos)
```javascript
{
  profiles: ["https://www.tiktok.com/@username"],
  resultsPerPage: 10
}
```

**Output:** Array com ~20 items MISTURADOS:
- 10 items tipo **POST** (vídeos do perfil)
- 10 items tipo **AUTHOR** (dados do perfil, todos iguais)

### 2. HASHTAGS (não usamos por agora)
```javascript
{
  hashtags: ["funny"],
  resultsPerPage: 100
}
```

**Output:** Array de vídeos que usaram essa hashtag

### 3. VIDEO URLs (não usamos por agora)
```javascript
{
  videoUrls: ["https://www.tiktok.com/@user/video/123"]
}
```

**Output:** Array com dados de vídeos específicos

---

## Estrutura: POSTS (vídeos)

**Como identificar:** Tem `webVideoUrl` definido

**Campos importantes:**
```json
{
  "webVideoUrl": "https://www.tiktok.com/@whos.babi/video/7525961517238340897",
  "text": "Caption do vídeo",
  "diggCount": 2200000,
  "shareCount": 55500,
  "playCount": 19300000,
  "commentCount": 3673,
  "videoMeta.duration": 9,
  "videoMeta.coverUrl": "https://...",
  "isAd": false,
  "hashtags": [],
  "authorMeta.name": "whos.babi",
  "createTimeISO": "2025-07-11T22:55:02.000Z"
}
```

**⚠️ IMPORTANTE:** Campos com ponto (ex: `videoMeta.duration`) são **strings flat**, não objetos aninhados!

---

## Estrutura: AUTHORS (perfil)

**Como identificar:** Tem `authorMeta.fans` definido

**Campos importantes:**
```json
{
  "authorMeta.avatar": "https://...",
  "authorMeta.name": "whos.babi",
  "authorMeta.nickName": "babi",
  "authorMeta.verified": false,
  "authorMeta.signature": "💌 contact.whosbabi@gmail.com IG: @whos.babi youtube: @whosbabi",
  "authorMeta.fans": 1300000,
  "authorMeta.video": 5035,
  "authorMeta.privateAccount": false,
  "authorMeta.ttSeller": false,
  "authorMeta.bioLink": "https://linktr.ee/whosbabi",
  "authorMeta.id": "6702489825629357061",
  "text": ""
}
```

**⚠️ CRÍTICO:** 
- Campos são **strings flat** com ponto no nome
- `item['authorMeta.fans']` ✅ correto
- `item.authorMeta.fans` ❌ ERRADO (não é objeto)

**Mapeamento para nosso schema:**
- `authorMeta.fans` → `followers` (Int)
- `authorMeta.verified` → `verified` (Boolean)
- `authorMeta.signature` → `biography` (String)
- `authorMeta.video` → `videoCount` (Int)
- `authorMeta.nickName` → `name` (String)
- `authorMeta.bioLink` → pode ir para notas
- `authorMeta.avatar` → URL da foto (guardar?)
- `authorMeta.privateAccount` → (Boolean, útil?)

---

## Estratégia de Parsing

```typescript
async function parseProfileQuery(allItems: any[]): Promise<{
  author: AuthorData;
  posts: PostData[];
}> {
  // 1. Separar por tipo
  const authors = allItems.filter(item => item['authorMeta.fans'] !== undefined);
  const posts = allItems.filter(item => item.webVideoUrl !== undefined);
  
  // 2. Validar
  if (authors.length === 0) {
    throw new Error('No author data returned by Apify');
  }
  
  // 3. Pegar primeiro author (todos são iguais)
  const authorData = authors[0];
  
  // 4. Extrair dados do author
  const author = {
    handle: authorData['authorMeta.name'],
    name: authorData['authorMeta.nickName'] || authorData['authorMeta.name'],
    followers: authorData['authorMeta.fans'] || 0,
    verified: authorData['authorMeta.verified'] || false,
    biography: authorData['authorMeta.signature'] || null,
    videoCount: authorData['authorMeta.video'] || 0,
    avatar: authorData['authorMeta.avatar'] || null,
    bioLink: authorData['authorMeta.bioLink'] || null,
  };
  
  // 5. Extrair posts (últimos 10 vídeos)
  const videoPosts = posts.slice(0, 10).map(post => ({
    url: post.webVideoUrl,
    caption: post.text || '',
    views: post.playCount || 0,
    likes: post.diggCount || 0,
    comments: post.commentCount || 0,
    shares: post.shareCount || 0,
    duration: post['videoMeta.duration'] || 0,
    createdAt: post.createTimeISO,
    hashtags: post.hashtags || [],
  }));
  
  return { author, posts: videoPosts };
}
```

---

## Regras CRÍTICAS

1. ✅ **ZERO estimativas** - se Apify não retorna, deixar NULL
2. ✅ **Campos flat com ponto** - usar `item['authorMeta.fans']`
3. ✅ **Separar authors vs posts** - não misturar
4. ✅ **Pegar 1º author** - todos são iguais (10 repetições)
5. ✅ **Máximo 10 vídeos** - para Gemini analisar
6. ✅ **Validar sempre** - se não há author data, erro claro

---

## Campos que NÃO temos (aceitar NULL)

- `estimatedPrice` - não há dados confiáveis, deixar NULL
- `engagementRate` - podemos calcular a partir de likes/views se quisermos
- `country` - Apify não retorna, deixar NULL
- `language` - não vem direto, deixar NULL ou tentar inferir de hashtags

---

## Para Gemini 3.0 Flash

Enviar:
```typescript
{
  profile: {
    handle: "@whos.babi",
    name: "babi",
    followers: 1300000,
    verified: false,
    bio: "💌 contact.whosbabi@gmail.com...",
  },
  videos: [
    {
      url: "https://www.tiktok.com/@whos.babi/video/123",
      caption: "...",
      views: 19300000,
      likes: 2200000,
      comments: 3673,
    },
    // ... até 10 vídeos
  ]
}
```

Gemini analisa e retorna:
- `fitScore` (1-5)
- `niche` (Fashion, Lifestyle, etc.)
- `strengths` (array)
- `opportunities` (array)
- `summary` (texto em PT)

---

## Checklist Final

- [ ] Separar authors vs posts corretamente
- [ ] Usar `item['authorMeta.fans']` (string flat)
- [ ] Validar que há author data (throw se não)
- [ ] Retornar NULL se campo não existe (não estimar)
- [ ] Máximo 10 vídeos para Gemini
- [ ] Logs detalhados para debug
- [ ] Testar com perfis reais
- [ ] Commit com mensagem clara

---

**Data:** 2026-02-11  
**Status:** Especificação completa ✅
