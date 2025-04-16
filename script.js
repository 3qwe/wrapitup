window.addEventListener("scroll", () => {
    document.querySelectorAll(".feature").forEach((el, i) => {
      const top = el.getBoundingClientRect().top;
      if (top < window.innerHeight - 100) {
        el.style.animation = "popIn 0.6s ease forwards";
      }
    });
  });