/* SPDX-License-Identifier: AGPL-3.0-only */
/* Copyright (C) 2025-2026 DIY Accounting Ltd */

// Lightbox functionality for images
(function () {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-image");
  const images = document.querySelectorAll(".lightbox-img");

  images.forEach(function (img) {
    img.addEventListener("click", function () {
      lightboxImg.src = this.src;
      lightboxImg.alt = this.alt;
      lightbox.classList.add("active");
      document.body.classList.add("lightbox-open");
    });
  });

  lightbox.addEventListener("click", function () {
    lightbox.classList.remove("active");
    document.body.classList.remove("lightbox-open");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
      lightbox.classList.remove("active");
      document.body.classList.remove("lightbox-open");
    }
  });
})();
