# StyleSense AI 👗

Guarda-roupa inteligente — catalogue suas roupas e receba sugestões diárias de looks
com base no **clima** e na **ocasião**. App mobile em Expo / React Native (MVP).

## Como rodar

```bash
cd stylesense-ai
npm install        # se ainda não instalou

# No celular (recomendado): instale o app "Expo Go" e rode:
npx expo start     # leia o QR code com o Expo Go

# No navegador (para teste rápido de UI):
npx expo start --web
```

> ⚠️ A localização/clima e a câmera funcionam melhor no celular (Expo Go) ou num build
> nativo. No navegador, o clima cai no modo "estimado" se a geolocalização for negada.

## O que já está pronto (MVP)

- **Hoje** — saudação, clima do dia (via [Open-Meteo](https://open-meteo.com), sem API key),
  seletor de ocasião (Casual / Trabalho / Esporte / Formal) e o **look sugerido**, com:
  - tocar numa peça para **trocá-la** individualmente;
  - **↻ Trocar tudo** para gerar outra combinação;
  - **👍 Vou usar este** (marca como usada, evita repetir) e **♡ Salvar**.
- **Guarda-roupa** — grade estilo Pinterest, filtro por categoria, segure para excluir.
- **Adicionar** — foto (câmera/galeria), categoria, cor, nível de agasalho e formalidade,
  flag de chuva e tags.

Os dados ficam **no próprio dispositivo** (local-first, via AsyncStorage). Nenhum backend
é necessário ainda.

## Arquitetura

```
App.tsx                 # navegação em abas (sem lib de router)
src/
  types.ts              # modelo de dados (peças, looks, ocasiões, cores)
  theme.ts              # tokens de estilo
  store.tsx             # estado global (React Context) + persistência
  storage.ts            # camada AsyncStorage (trocável por API no futuro)
  weather.ts            # clima via Open-Meteo + expo-location (com fallback)
  suggestion.ts         # MOTOR de sugestão de looks (regras: clima + ocasião + variedade)
  components/           # UI compartilhada (botões, chips, miniatura de peça)
  screens/              # TodayScreen, WardrobeScreen, AddItemScreen
```

### Como o motor de sugestão decide (`src/suggestion.ts`)

1. **Clima → agasalho alvo**: faixas de sensação térmica definem o nível de roupa (1–5)
   e se precisa de casaco.
2. **Ocasião → formalidade alvo**: cada ocasião tem um alvo de formalidade (1–5).
3. **Pontuação por peça**: proximidade de agasalho e formalidade, bônus para impermeável
   na chuva, penalidade para peças usadas recentemente (variedade) e harmonia simples de
   cor (neutros combinam com tudo; evita duas cores fortes brigando).
4. **Seed** muda a cada "trocar", gerando variações estáveis.

## Próximos passos sugeridos (fora do MVP)

- Remoção de fundo da foto da peça (IA de visão computacional).
- Categorização automática por reconhecimento de imagem.
- Integração com a agenda (Google/Outlook) para inferir a ocasião do dia.
- Aprendizado com feedback (curtidas/edições) para recomendação por ML.
- Backend + sincronização entre dispositivos, lista de desejos e estatísticas.
```

---
Stack: Expo SDK 56 · React Native 0.85 · TypeScript · AsyncStorage · expo-location · expo-image-picker
```
