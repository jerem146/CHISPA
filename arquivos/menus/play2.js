const axios = require("axios");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🧮 Função para abreviar visualizações
function formatarVisualizacoes(num) {
    if (!num || isNaN(num)) return "??";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "mi";
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "k";
    return num.toString();
}

module.exports = async function play2Command(sock, from, Info, args, prefix, API_KEY_TED) {
    const reply = (texto) => sock.sendMessage(from, { text: texto }, { quoted: Info });

    try {
        const query = args.join(" ");
        if (!query) {
            return reply(`❌ Cadê o nome ou link do YouTube?\nExemplo: ${prefix}play2 tz da coronel`);
        }

        let finalUrl = query;
        let videoInfo = null;

        // 🔎 Pesquisa no YouTube caso não seja link
        if (!query.includes("youtu")) {
            const searchUrl = `https://tedzinho.com.br/api/pesquisa/youtube?apikey=${API_KEY_TED}&query=${encodeURIComponent(query)}`;
            try {
                const pesquisa = await axios.get(searchUrl);
                const resultados = pesquisa.data?.resultado;

                if (!resultados || resultados.length === 0) {
                    return reply("❌ Nenhum resultado encontrado para sua busca.");
                }

                // 📄 Salva o primeiro resultado
                videoInfo = resultados[0];
                finalUrl = videoInfo.url;

            } catch {
                return reply("❌ Erro ao buscar no YouTube.");
            }
        }

        // 🎧 Download do áudio via API do Tedzinho
        const apiUrl = `https://tedzinho.com.br/api/download/play_audio/v9?apikey=${API_KEY_TED}&nome_url=${encodeURIComponent(finalUrl)}`;
        const inicio = Date.now();
        let dados = null;
        const maxTentativas = 5;
        const intervalo = 10000; // 10 segundos

        for (let i = 1; i <= maxTentativas; i++) {
            try {
                const res = await axios.get(apiUrl);
                if (res.data?.status === "OK" && res.data?.resultado?.status === true) {
                    dados = res.data.resultado;
                    break;
                }
            } catch {
                // ignora erros e tenta novamente
            }
            if (i < maxTentativas) await sleep(intervalo);
        }

        if (!dados) {
            return reply("❌ Não foi possível obter o áudio após várias tentativas. Tente novamente em alguns segundos.");
        }

        const title = videoInfo?.title || dados.titulo || "Sem título";
        const channel = videoInfo?.author?.name || "Desconhecido";
        const duration = videoInfo?.timestamp || "??";
        const views = videoInfo?.views ? formatarVisualizacoes(videoInfo.views) : "??";
        const posted = videoInfo?.ago || "??";
        const thumbnail = videoInfo?.thumbnail || `https://i.ytimg.com/vi/${dados.video_id}/hqdefault.jpg`;

        // 🪄 Legenda final completa
        const legenda = 
`🎵 **${title}**
━━━━━━━━━━━━━━━━━━
👤 **Canal:** ${channel}
⏱️ **Duração:** ${duration}
👁️ **Visualizações:** ${views}
📅 **Postado:** ${posted}

📊 **Status do Sistema**
├─ 📡 **Rota:** Tedzinho API
├─ 💾 **Cache:** ${dados.cached ? "✅ Sim" : "❌ Não"}
└─ ⏱️ **Tempo:** ${(Date.now() - inicio) / 1000}s `;

        try {
            const audioResponse = await axios.get(dados.download_url, { responseType: "arraybuffer" });
            const audioBuffer = Buffer.from(audioResponse.data);

            // Envia capa + legenda + áudio
            await sock.sendMessage(from, { image: { url: thumbnail }, caption: legenda }, { quoted: Info });
            await sock.sendMessage(from, {
                audio: audioBuffer,
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`,
                ptt: false
            }, { quoted: Info });

        } catch {
            reply("❌ Erro ao enviar o áudio.");
        }

    } catch {
        reply("❌ Erro ao processar sua música. Verifique o link ou nome e tente novamente.");
    }
};