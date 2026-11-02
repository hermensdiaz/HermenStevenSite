/* =========================================================
   CONFIGURACIÓN DEL LOBBY
   Edita aquí el nombre del sitio y las secciones.
   Cada sección se convierte en un cuadro en la pared.
   ========================================================= */
window.LOBBY_CONFIG = {
  siteName: "Mi Sitio",

  sections: [
    {
      id: "videojuegos",
      title: "Videojuegos",
      subtitle: "Juega y explora",
      icon: "🎮",
      url: "videojuegos.html",
      color: "#6c3fc9"
    },
    {
      id: "proyectos",
      title: "Proyectos",
      subtitle: "Lo que he construido",
      icon: "🛠️",
      url: "proyectos.html",
      color: "#1f7a5a"
    },
    {
      id: "galeria",
      title: "Galería 3D",
      subtitle: "Modelos y renders",
      icon: "🖼️",
      url: "galeria.html",
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
