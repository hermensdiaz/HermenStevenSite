/* =========================================================
   CONFIGURACIÓN DEL LOBBY
   Edita aquí el nombre del sitio y las secciones.
   Cada sección se convierte en un cuadro en la pared.
   ========================================================= */
window.LOBBY_CONFIG = {
  siteName: "Mi Sitio",

  sections: [
    /* ---- Juegos ----
       Las rutas son relativas a la carpeta lobby/, por eso empiezan con "../".
       El espacio de "survival mamuts" va como %20 para que funcione en cualquier servidor. */
    {
      id: "mamuts4ever",
      title: "Mamuts4ever",
      subtitle: "Jugar ahora",
      icon: "🦣",
      url: "../games/mamuts4ever/index.html",
      color: "#6c3fc9"
    },
    {
      id: "survival-mamuts",
      title: "Survival Mamuts",
      subtitle: "Jugar ahora",
      icon: "🏹",
      url: "../games/survival%20mamuts/index.html",
      color: "#1f7a5a"
    },

    /* ---- Otras secciones (cambia sus url cuando existan) ---- */
    {
      id: "proyectos",
      title: "Proyectos",
      subtitle: "Lo que he construido",
      icon: "🛠️",
      url: "proyectos.html",
      color: "#b5532a"
    },
    {
      id: "blog",
      title: "Blog",
      subtitle: "Notas y tutoriales",
      icon: "📝",
      url: "blog.html",
      color: "#2a5fb5"
    },
    {
      id: "sobre-mi",
      title: "Sobre mí",
      subtitle: "Quién soy",
      icon: "👤",
      url: "sobre-mi.html",
      color: "#8a2a6a"
    },
    {
      id: "contacto",
      title: "Contacto",
      subtitle: "Escríbeme",
      icon: "✉️",
      url: "contacto.html",
      color: "#a07a14",
      newTab: false // pon true para abrir en otra pestaña
    }
  ]
};
