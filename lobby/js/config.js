/* =========================================================
   CONFIGURACIÓN DEL LOBBY
   Edita aquí el nombre del sitio y las secciones.
   Cada sección se convierte en un cuadro en la pared.
   ========================================================= */
window.LOBBY_CONFIG = {
  siteName: "Mi Sitio",

  sections: [
    /* ---- Juegos ----
       Las rutas son relativas al index.html de la raíz del sitio.
       El espacio de "survival mamuts" va como %20 para que funcione en cualquier servidor. */
    {
      id: "mamuts4ever",
      title: "Mamuts4ever",
      subtitle: "Jugar ahora",
      icon: "🦣",
      url: "games/mamuts4ever/index.html",
      color: "#9b8cff"
    },
    {
      id: "survival-mamuts",
      title: "Survival Mamuts",
      subtitle: "Jugar ahora",
      icon: "🏹",
      url: "games/survival%20mamuts/index.html",
      color: "#5cc98a"
    },

    /* ---- Otras secciones (cambia sus url cuando existan) ---- */
    {
      id: "proyectos",
      title: "Proyectos",
      subtitle: "Lo que he construido",
      icon: "🛠️",
      url: "proyectos.html",
      color: "#ff9f80"
    },
    {
      id: "blog",
      title: "Blog",
      subtitle: "Notas y tutoriales",
      icon: "📝",
      url: "blog.html",
      color: "#6fb4ff"
    },
    {
      id: "sobre-mi",
      title: "Sobre mí",
      subtitle: "Quién soy",
      icon: "👤",
      url: "sobre-mi.html",
      color: "#f08cb8"
    },
    {
      id: "contacto",
      title: "Contacto",
      subtitle: "Escríbeme",
      icon: "✉️",
      url: "contacto.html",
      color: "#f5c451",
      newTab: false // pon true para abrir en otra pestaña
    }
  ]
};
