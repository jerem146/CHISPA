// ./arquivos/menus/welcome.js

module.exports = async function handleWelcomeCommand(sock, Info, from, args, prefix, groupState, groupManager, logger, getPermissions, BOT_PHONE, sasah) {
  try {
    // ✅ Corrección: detectar si es grupo correctamente
    const isGroup = from.endsWith("@g.us");

    if (!isGroup) {
      return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." }, { quoted: sasah });
    }

    // 🔒 Verificar permisos de administrador o dueño
    const perms = await getPermissions(sock, from, Info.key.participant, BOT_PHONE);
    if (!perms.isAdmin && !perms.isOwnerGroup) {
      return sock.sendMessage(from, { text: "❌ Solo los administradores pueden usar este comando." }, { quoted: sasah });
    }

    // 🔧 Obtener estado actual del grupo
    const opt = (args[0] || "").toLowerCase();
    const groupData = groupState.get(from) || { welcome: false };

    // ✅ Activar / Desactivar el sistema
    if (opt === "on" || opt === "off") {
      groupData.welcome = opt === "on";
      groupState.set(from, groupData);

      logger.log("CONFIG_CHANGED", {
        setting: "Bienvenida del grupo",
        value: groupData.welcome,
        groupId: from,
        groupName: perms.groupName,
        changer: Info.pushName,
        privateId: Info.key.participant || Info.key.remoteJid,
        phoneNumber: (Info.key.participant || Info.key.remoteJid).split("@")[0]
      });

      await groupManager.saveGroupData(sock, from, "settings_changed");

      return sock.sendMessage(from, { 
        text: `🎉 El sistema de bienvenida del grupo ha sido ${groupData.welcome ? "✅ *ACTIVADO*" : "❌ *DESACTIVADO*"}.`
      }, { quoted: sasah });
    }

    // 📊 Mostrar estado actual
    if (opt === "status") {
      return sock.sendMessage(from, {
        text: `🎚️ *Estado del sistema de bienvenida:*\n• Grupo: ${groupData.welcome ? "✅ ON" : "❌ OFF"}`
      }, { quoted: sasah });
    }

    // 🧪 Prueba de bienvenida
    if (opt === "test") {
      const sender = Info.key.participant || Info.key.remoteJid;
      const senderNumber = String(sender).split("@")[0];
      const fallbackImg = "https://i.ibb.co/znmQqZk/placeholder.jpg";
      const ppUser  = await sock.profilePictureUrl(sender, "image").catch(() => null);
      const ppGroup = await sock.profilePictureUrl(from, "image").catch(() => null);
      const thumb   = ppUser || ppGroup || fallbackImg;

      return sock.sendMessage(from, {
        text: `Hola @${senderNumber}, este es un *preview* del sistema de bienvenida.`,
        mentions: [sender],
        contextInfo: {
          mentionedJid: [sender],
          externalAdReply: {
            title: "👋 ¡Bienvenido!",
            body: `${senderNumber}@s.whatsapp.net`,
            mediaType: 1,
            renderLargerThumbnail: true,
            thumbnailUrl: thumb,
            sourceUrl: ""
          }
        }
      }, { quoted: sasah });
    }

    // 📘 Menú de ayuda
    return sock.sendMessage(from, { 
      text: `⚙️ *Configurar la bienvenida del grupo*\n\n• ${prefix}welcome on\n• ${prefix}welcome off\n• ${prefix}welcome status\n• ${prefix}welcome test`
    }, { quoted: sasah });

  } catch (err) {
    console.error("❌ Error en el comando 'welcome':", err);
    return sock.sendMessage(from, { text: "⚠️ Ocurrió un error al ejecutar el comando de bienvenida." }, { quoted: sasah });
  }
};