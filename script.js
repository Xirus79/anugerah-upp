// ===== 1. SERVICE TABS LOGIC =====
const serviceTabs = document.querySelectorAll('.service-tabs .tab');
if (serviceTabs.length > 0) {
  serviceTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.service-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.service === btn.textContent.toLowerCase().split(' ')[0]);
      });
    });
  });
}

// ===== 2. PORTFOLIO CAROUSEL DENGAN GOOGLE SHEETS =====
(function(){
  // MASUKKAN LINK TSV (BUKAN CSV) GOOGLE SHEETS DI SINI
  const tsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0hszsBjPA_dKuF1LSAgQY0_A0pTs69I3j7bwRjlttNO1eQOtQ0_OvAe9AroJLwgf3tCwqOadqOUjA/pub?output=tsv';
  
  const source = document.getElementById('projectSource');
  if (!source) return;

  // Fungsi otomatis mengubah link Google Drive menjadi Thumbnail API
  function ubahLinkDrive(url) {
      if (url.includes('drive.google.com')) {
          const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
              return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
          }
      }
      return url;
  }

  // TAMBAHAN BARU: Fungsi untuk Mencegah XSS (Keamanan)
  function amankanTeks(str) {
      if (!str) return '';
      // Membuat elemen bayangan untuk mengubah tag bahaya menjadi teks biasa
      const div = document.createElement('div');
      div.textContent = str; 
      return div.innerHTML; 
  }

  // TAMBAHAN BARU: Memunculkan UI Loading
  const track = document.getElementById('projectTrack');
  const loadingIndicator = document.createElement('div');
  loadingIndicator.style.cssText = 'width: 100%; text-align: center; padding: 40px; font-weight: 600; color: var(--navy); font-family: "Space Grotesk", sans-serif;';
  loadingIndicator.innerText = 'Memuat Portofolio terbaru...';
  if (track) track.appendChild(loadingIndicator);

  // Menarik data dari Google Sheets
  fetch(tsvUrl)
    .then(response => {
        if (!response.ok) throw new Error("Gagal mengambil data");
        return response.text();
    })
    .then(data => {
        const baris = data.split('\n');
        
        // Gudang penampungan sementara
        let htmlBaru = ''; 

        for (let i = 1; i < baris.length; i++) {
            const kolom = baris[i].split('\t');

            if (kolom.length >= 5) {
                // Semua teks dimasukkan ke amankanTeks() untuk mencegah injeksi script nakal
                const kategori = amankanTeks(kolom[0].trim().toLowerCase());
                const nama = amankanTeks(kolom[1].trim());
                const descSingkat = amankanTeks(kolom[2].trim());
                const descPanjang = amankanTeks(kolom[3].trim());
                let gambar = kolom[4].trim();

                gambar = ubahLinkDrive(gambar);

                htmlBaru += `
                  <article class="project-card" data-category="${kategori}">
                    <div class="card-image-wrapper">
                      <img src="${gambar}" alt="${nama}">
                      <div class="image-overlay">
                        <p>${descSingkat}</p>
                      </div>
                    </div>
                    <div class="card-footer">
                      <div class="card-title-row">
                        <h4>${nama}</h4>
                        <button class="dropdown-toggle-btn" aria-label="Toggle Details">
                          <span class="arrow-icon">▼</span>
                        </button>
                      </div>
                      <div class="card-dropdown-content">
                        <p>${descPanjang}</p>
                      </div>
                    </div>
                  </article>
                `;
            }
        }
        
        // Hapus elemen loading
        if (loadingIndicator.parentNode) loadingIndicator.remove();
        
        // Ganti pajangan jika ada data baru (Fallback Strategy)
        if (htmlBaru.trim() !== '') {
            source.innerHTML = htmlBaru; 
        }
        
        initCarousel();
    })
    .catch(error => {
        console.error('Gagal memuat data dari Google Sheets:', error);
        if (loadingIndicator.parentNode) loadingIndicator.remove();
        initCarousel(); // Tetap jalankan slider dengan "pajangan cadangan" HTML asli
    });

  // --- LOGIKA ASLI CAROUSEL KAMU ---
  function initCarousel() {
      const track = document.getElementById('projectTrack');
      const dotsWrap = document.getElementById('projectDots');
      const prevBtn = document.getElementById('projectPrev');
      const nextBtn = document.getElementById('projectNext');
      const carouselWrap = document.querySelector('.project-carousel');
      const filterTabs = document.querySelectorAll('.filter-row .tab');

      if (!track || !dotsWrap) return;

      const allCards = Array.from(source.querySelectorAll('.project-card'));
      let currentFilter = 'all';
      let page = 0;
      let totalPages = 0;
      let isTransitioning = false;
      let autoplayTimer = null;

      function groupSize(){
        const w = window.innerWidth;
        if (w <= 576) return 2;
        if (w <= 960) return 3;
        return 5;
      }

      function getFiltered(){
        return currentFilter === 'all'
          ? allCards
          : allCards.filter(card => card.dataset.category === currentFilter);
      }

      function buildPages(){
        stopAutoplay();
        const size = groupSize();
        const cards = getFiltered();
        track.innerHTML = '';
        dotsWrap.innerHTML = '';

        if (cards.length === 0){
          totalPages = 0;
          render(false);
          return;
        }
        if (window.innerWidth <= 768) {
          cards.forEach(card => track.appendChild(card.cloneNode(true)));
          return; 
        }
        const groups = [];
        for (let i = 0; i < cards.length; i += size){
          groups.push(cards.slice(i, i + size));
        }
        totalPages = groups.length;

        groups.forEach(group => {
          const pageEl = document.createElement('div');
          pageEl.className = 'project-page';
          pageEl.style.setProperty('--project-cols', size);
          group.forEach(card => pageEl.appendChild(card.cloneNode(true)));
          track.appendChild(pageEl);
        });

        if (totalPages > 1) {
          const originalPages = Array.from(track.querySelectorAll('.project-page'));
          originalPages.forEach(p => track.appendChild(p.cloneNode(true)));
        }

        const totalSlides = totalPages > 1 ? totalPages * 2 : totalPages;
        track.style.width = (totalSlides * 100) + '%';
        track.querySelectorAll('.project-page').forEach(p => {
          p.style.flex = `0 0 ${100 / totalSlides}%`;
          p.style.width = `${100 / totalSlides}%`;
        });

        for (let i = 0; i < totalPages; i++){
          const dot = document.createElement('span');
          if (i === 0) dot.classList.add('active');
          dot.addEventListener('click', () => {
            if (isTransitioning || page === i) return;
            page = i;
            render(true);
          });
          dotsWrap.appendChild(dot);
        }
        if (totalPages <= 1) {
          if (prevBtn) prevBtn.style.display = 'none';
          if (nextBtn) nextBtn.style.display = 'none';
        } else {
          if (prevBtn) prevBtn.style.display = 'flex';
          if (nextBtn) nextBtn.style.display = 'flex';
        }
        page = 0;
        render(false);
        if (totalPages > 1) startAutoplay();
      }
      
      track.addEventListener('transitionend', () => {
        isTransitioning = false;
        if (page >= totalPages && totalPages > 1) {
          page = 0; 
          render(false);
        }
      });

      function render(withTransition){
        const totalSlides = totalPages > 1 ? totalPages * 2 : totalPages;
        if (totalSlides <= 0) return;
        if (withTransition) {
          track.style.transition = 'transform .6s cubic-bezier(0.25, 1, 0.5, 1)';
          isTransitioning = true;
        } else {
          track.style.transition = 'none';
          isTransitioning = false;
        }
        track.offsetHeight; 
        track.style.transform = `translateX(-${page * (100 / totalSlides)}%)`;

        if (dotsWrap) {
          const dots = dotsWrap.querySelectorAll('span');
          const activeDot = page % totalPages;
          dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeDot);
          });
        }
      }

      function nextPage(){
        if (isTransitioning || totalPages <= 1) return;
        page++;
        render(true);
      }

      function prevPage(){
        if (isTransitioning || totalPages <= 1) return;
        if (page === 0) {
          page = totalPages; 
          render(false);
          track.offsetHeight; 
        }
        page--;
        render(true);
      }

      function startAutoplay(){
        stopAutoplay();
        autoplayTimer = setInterval(nextPage, 3500);
      }
      function stopAutoplay(){
        if (autoplayTimer) clearInterval(autoplayTimer);
        autoplayTimer = null;
      }

      if (prevBtn) prevBtn.addEventListener('click', prevPage);
      if (nextBtn) nextBtn.addEventListener('click', nextPage);
      if (carouselWrap){
        carouselWrap.addEventListener('mouseenter', stopAutoplay);
        carouselWrap.addEventListener('mouseleave', () => { if (totalPages > 1) startAutoplay(); });
      }

      if (filterTabs.length){
        filterTabs.forEach(btn => {
          btn.addEventListener('click', () => {
            filterTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            buildPages();
          });
        });
      }

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildPages, 250);
      });

      track.addEventListener('click', (event) => {
        const toggleBtn = event.target.closest('.dropdown-toggle-btn');
        if (toggleBtn) {
          event.stopPropagation();
          const card = toggleBtn.closest('.project-card');
          
          track.querySelectorAll('.project-card').forEach(item => {
            if (item !== card) item.classList.remove('open');
          });
          
          if (card) card.classList.toggle('open');
          return;
        }
      });

      buildPages();
  }
})();

// ===== 3. CLIENT CAROUSEL LOGIC DENGAN GOOGLE SHEETS =====
(function(){
  // MASUKKAN LINK TSV KHUSUS UNTUK TAB "CLIENT"
  const clientTsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0hszsBjPA_dKuF1LSAgQY0_A0pTs69I3j7bwRjlttNO1eQOtQ0_OvAe9AroJLwgf3tCwqOadqOUjA/pub?gid=399638841&single=true&output=tsv';
   
  const track = document.getElementById('clientTrack');
  const dotsWrap = document.getElementById('clientDots');
  const prevBtn = document.getElementById('clientPrev');
  const nextBtn = document.getElementById('clientNext');
  const container = document.querySelector('.client-carousel');
  
  if (!track) return; 

  // Fungsi bantuan untuk Google Drive Image API
  function ubahLinkDrive(url) {
      if (url.includes('drive.google.com')) {
          const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
              return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
          }
      }
      return url;
  }

  // Fungsi bantuan untuk mencegah XSS
  function amankanTeks(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str; 
      return div.innerHTML; 
  }

  // 1. Simpan HTML asli sebagai "pajangan cadangan" (Fallback)
  const fallbackHTML = track.innerHTML;

  // 2. Tarik data dari Google Sheets (Tab Client)
  fetch(clientTsvUrl)
    .then(response => {
        if (!response.ok) throw new Error("Gagal menarik data klien");
        return response.text();
    })
    .then(data => {
        const baris = data.split('\n');
        let htmlBaru = '';

        // Looping data klien (mulai dari baris ke-2 karena baris 1 adalah header)
        for (let i = 1; i < baris.length; i++) {
            const kolom = baris[i].split('\t');
            // Pastikan ada minimal 2 kolom (Nama Mitra & Link Logo)
            if (kolom.length >= 2) {
                const nama = amankanTeks(kolom[0].trim());
                let gambar = kolom[1].trim();
                gambar = ubahLinkDrive(gambar);

                if (gambar !== '') {
                  // Cetak HTML untuk masing-masing logo
                  htmlBaru += `<div class="client-logo-card"><img src="${gambar}" alt="${nama}"></div>`;
                }
            }
        }

        // 3. Jika ada data baru yang valid, timpa HTML di dalam track
        if (htmlBaru.trim() !== '') {
            track.innerHTML = htmlBaru;
        }
        
        // 4. Inisialisasi logika Slider/Carousel
        initClientCarousel();
    })
    .catch(error => {
        console.error('Gagal memuat data Client dari Google Sheets:', error);
        // Jika gagal, kembalikan ke "pajangan cadangan" dari HTML asli
        track.innerHTML = fallbackHTML; 
        initClientCarousel();
    });


  // --- LOGIKA ASLI CAROUSEL CLIENT ---
  function initClientCarousel() {
      // Ambil ulang semua logo card setelah di-inject (atau dari fallback)
      const allCards = Array.from(track.querySelectorAll('.client-logo-card'));
      if (allCards.length === 0) return;

      let page = 0;
      let totalPages = 0;
      let isTransitioning = false; 
      let autoplayTimer = null;

      function getItemsPerPage() {
        return window.innerWidth <= 768 ? 1 : 2; 
      }

      function buildClientPages() {
        stopAutoplay();
        const itemsPerPage = getItemsPerPage();
        
        track.innerHTML = '';
        if (dotsWrap) dotsWrap.innerHTML = '';
        
        const groups = [];
        for (let i = 0; i < allCards.length; i += itemsPerPage) {
          groups.push(allCards.slice(i, i + itemsPerPage));
        }
        totalPages = groups.length;

        if (totalPages === 0) return;

        groups.forEach(group => {
          const pageEl = document.createElement('div');
          pageEl.className = 'client-page';
          group.forEach(card => pageEl.appendChild(card.cloneNode(true)));
          track.appendChild(pageEl);
        });

        const originalPages = Array.from(track.querySelectorAll('.client-page'));
        originalPages.forEach(p => track.appendChild(p.cloneNode(true)));

        const totalSlides = totalPages * 2;
        track.style.width = (totalSlides * 100) + '%';
        
        track.querySelectorAll('.client-page').forEach(p => {
          p.style.flex = `0 0 ${100 / totalSlides}%`;
          p.style.width = `${100 / totalSlides}%`;
        });

        if (dotsWrap) {
          for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('span');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
              if (isTransitioning || page === i) return;
              page = i;
              render(true);
            });
            dotsWrap.appendChild(dot);
          }
        }

        page = 0;
        render(false);
        if (totalPages > 1) startAutoplay();
      }

      function render(withTransition = true) {
        const totalSlides = totalPages * 2;
        if (totalSlides <= 0) return;

        if (withTransition) {
          track.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
          isTransitioning = true;
        } else {
          track.style.transition = 'none';
          isTransitioning = false;
        }
        
        track.offsetHeight;
        track.style.transform = `translateX(-${page * (100 / totalSlides)}%)`;
        
        if (dotsWrap) {
          const dots = dotsWrap.querySelectorAll('span');
          const activeDot = page % totalPages;
          dots.forEach((d, i) => d.classList.toggle('active', i === activeDot));
        }
      }

      function nextPage() {
        if (isTransitioning || totalPages <= 1) return;
        page++;
        render(true);
      }

      function prevPage() {
        if (isTransitioning || totalPages <= 1) return;
        if (page === 0) {
          page = totalPages;
          render(false);
          track.getBoundingClientRect();
        }
        page--;
        render(true);
      }

      track.addEventListener('transitionend', () => {
        isTransitioning = false;
        if (page >= totalPages) {
          page = 0;
          render(false);
        }
      });

      function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(nextPage, 1500); 
      }

      function stopAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
        autoplayTimer = null;
      }

      if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); prevPage(); });
      if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); nextPage(); });

      if (container) {
        container.addEventListener('mouseenter', stopAutoplay);
        container.addEventListener('mouseleave', () => { if (totalPages > 1) startAutoplay(); });
      }

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildClientPages, 250);
      });

      let clientTouchStartX = 0;
      let clientTouchEndX = 0;
      
      track.addEventListener('touchstart', e => {
        clientTouchStartX = e.changedTouches[0].screenX;
        stopAutoplay(); 
      }, {passive: true});
      
      track.addEventListener('touchend', e => {
        clientTouchEndX = e.changedTouches[0].screenX;
        handleClientSwipe();
        if (totalPages > 1) startAutoplay(); 
      }, {passive: true});
      
      function handleClientSwipe() {
        const swipeDistance = clientTouchEndX - clientTouchStartX;
        const minDistance = 40; 
        
        if (swipeDistance < -minDistance) {
          nextPage(); 
        } else if (swipeDistance > minDistance) {
          prevPage(); 
        }
      }

      buildClientPages();
  }
})();

// ===== 4. SMART HEADER LOGIC =====
let lastScrollTop = 0;
const headerMain = document.querySelector('.header-main');

if (headerMain) {
  window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;

      if (currentScroll <= 0) {
          headerMain.classList.remove('scroll-down', 'scroll-up');
          return;
      }

      if (currentScroll > lastScrollTop) {
          headerMain.classList.remove('scroll-up');
          headerMain.classList.add('scroll-down');
      } else {
          headerMain.classList.remove('scroll-down');
          headerMain.classList.add('scroll-up');
      }
      lastScrollTop = currentScroll;
  });
}

// ===== 5. EFEK PARALLAX HERO & SERVICES =====
const hero = document.querySelector('.hero');
const services = document.querySelector('.services');
const application = document.querySelector('.application');

window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;
    const windowHeight = window.innerHeight;
    
    if (hero && scrollPos < windowHeight) {
        const heroSpeed = scrollPos * 0.3;
        hero.style.setProperty('--hero-parallax', `${heroSpeed}px`);
    }
    
    if (services) {
        const servicesRect = services.getBoundingClientRect();
        if (servicesRect.top < windowHeight && servicesRect.bottom > 0) {
            const servicesSpeed = (windowHeight - servicesRect.top) * 0.15; 
            services.style.setProperty('--services-parallax', `${servicesSpeed}px`);
        }
    }

    if (application) {
        const applicationRect = application.getBoundingClientRect();
        if (applicationRect.top < windowHeight && applicationRect.bottom > 0) {
            const applicationSpeed = (windowHeight - applicationRect.top) * 0.15;
            application.style.setProperty('--application-parallax', `${applicationSpeed}px`);
        }
    }
});

// ===== 6. REAL-TIME MAILTO GENERATOR (WITH SNACKBAR NOTIFICATION) =====

// Fungsi global untuk membuat dan memunculkan Snackbar / Toast
function showToast(type, message) {
  const container = document.getElementById('toastContainer');
  if (!container) return; // Mencegah error jika kontainer belum dirender di HTML
  
  // Buat elemen toast baru
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  
  // Berikan ikon simbol sederhana di depan teks
  const icon = type === 'success' ? '✓' : '×';
  toast.innerHTML = `<span style="font-weight: bold; color: ${type === 'success' ? '#2ecc71' : '#e74c3c'}">${icon}</span> <span>${message}</span>`;
  
  // Masukkan ke dalam container
  container.appendChild(toast);
  
  // Trigger animasi masuk
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hapus toast otomatis setelah 4 detik
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 4000);
}

document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contactForm'); 

  if (contactForm) {
    contactForm.addEventListener('submit', function(event) {
      event.preventDefault(); // Mencegah browser reload halaman

      // Mengambil waktu sekarang format Indonesia untuk input tersembunyi
      const opsiWaktu = { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZoneName: 'short' 
      };
      const waktuSekarang = new Date().toLocaleString('id-ID', opsiWaktu);
      
      const hiddenWaktuInput = document.getElementById('waktuKirim');
      if (hiddenWaktuInput) {
        hiddenWaktuInput.value = waktuSekarang;
      }

      // Mengubah teks tombol secara dinamis saat proses mengirim
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : "Send Message →";
      if (submitBtn) {
        submitBtn.innerText = "Sending...";
        submitBtn.disabled = true; // Kunci tombol agar user tidak klik berkali-kali
      }

      // --- TAMBAHAN BARU: Kirim data ke Google Sheets ---
      // PASTE URL WEB APP APPS SCRIPT KAMU DI SINI:
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbwnW4cKFk8DH-xBLYypCsIRuZARwCrrUuZOyhtuDUFIUPPVxHsB37uI-DNF6RuR3XuZ/exec';
      
      // Ambil seluruh data dari form
      const formData = new FormData(contactForm);

      // Kita jalankan 2 fungsi sekaligus (Paralel): Kirim ke Sheets & Kirim ke EmailJS
      Promise.all([
        fetch(googleScriptUrl, { method: 'POST', body: formData }),
        emailjs.sendForm('service_mjulr7l', 'template_8qhk1uf', this)
      ])
      .then(() => {
          // Jika keduanya sukses
          showToast('success', "Pesan berhasil dikirim dan tersimpan! Terima kasih.");
          contactForm.reset();
          if (submitBtn) {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
          }
      })
      .catch((error) => {
          // Jika ada yang gagal
          console.error("Error:", error);
          showToast('error', "Gagal mengirim pesan. Silakan coba beberapa saat lagi.");
          if (submitBtn) {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
          }
      });
    });
  }
});

// ===== 7. INTERSECTION OBSERVER FOR SCROLL REVEAL =====
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        // Jika elemen sudah masuk ke area sorot layar
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            // Unobserve digunakan jika kamu ingin animasi hanya berjalan 1 kali saja 
            // saat di-scroll down (tidak menghilang lagi saat di-scroll up)
            scrollObserver.unobserve(entry.target); 
        }
    });
}, {
    // threshold 0.15 berarti elemen akan memicu animasi 
    // ketika 15% dari bagian tubuhnya sudah mulai mengintip masuk ke layar
    threshold: 0.15 
});

// Cari semua elemen di HTML yang memiliki class hidden-scroll untuk diawasi
const hiddenElements = document.querySelectorAll('.hidden-scroll');
hiddenElements.forEach((el) => scrollObserver.observe(el));

// ===== 8. DROPDOWN TO ACCORDION SYNC LOGIC =====
const dropdownLinks = document.querySelectorAll('.dropdown-link');

if (dropdownLinks.length > 0) {
  dropdownLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      // Ambil ID target dari atribut href (misal: "#about-history")
      const targetId = this.getAttribute('href');
      const targetAccordion = document.querySelector(targetId);

      if (targetAccordion) {
        // 1. Tutup semua akordeon lain terlebih dahulu agar rapi
        document.querySelectorAll('.accordion-item').forEach(item => {
          item.removeAttribute('open'); // Untuk tag <details> bawaan HTML
          // Jika kamu menggunakan class JS kustom, sesuaikan menjadi: item.classList.remove('active');
        });

        // 2. Buka akordeon yang dituju secara spesifik
        targetAccordion.setAttribute('open', ''); // Untuk tag <details> bawaan HTML
        // Jika menggunakan class JS kustom, sesuaikan menjadi: targetAccordion.classList.add('active');

        // 3. Gulir halaman secara mulus (smooth scroll) ke elemen akordeon tersebut
        // Jeda sedikit agar proses scroll berjalan mulus setelah rendering buka-tutup selesai
        setTimeout(() => {
          targetAccordion.scrollIntoView({
            behavior: 'smooth',
            block: 'center' // Memposisikan akordeon tepat di tengah layar monitor/HP
          });
        }, 100);
      }
    });
  });
}

// ===== 9. ABOUT US AUTO IMAGE SLIDER (CROSS-FADE) =====
(function(){
  const slides = document.querySelectorAll('.about-slide');
  const dotsWrap = document.getElementById('aboutSliderDots');
  const frame = document.querySelector('.about-photo-frame');

  if (slides.length <= 1 || !frame) return; // Tidak perlu slider kalau cuma 1 gambar

  let current = 0;
  let timer = null;

  // Buat titik indikator sejumlah gambar
  slides.forEach((slide, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goTo(i));
    if (dotsWrap) dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap ? dotsWrap.querySelectorAll('span') : [];

  function goTo(index){
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
  }

  function next(){
    goTo((current + 1) % slides.length);
  }

  function startAutoplay(){
    stopAutoplay();
    timer = setInterval(next, 2500); // Ganti gambar setiap 2.5 detik
  }
  function stopAutoplay(){
    if (timer) clearInterval(timer);
  }

  // Jeda autoplay saat mouse di atas foto, lanjut lagi saat mouse pergi
  frame.addEventListener('mouseenter', stopAutoplay);
  frame.addEventListener('mouseleave', startAutoplay);
  
  /* === 1. TAMBAHKAN FUNGSI MUNDUR (PREV) DULU === */
  function prev(){
    goTo((current - 1 + slides.length) % slides.length);
  }

  /* === 2. KODE SWIPE ABOUT SLIDER === */
  let aboutTouchStartX = 0;
  let aboutTouchEndX = 0;
  
  frame.addEventListener('touchstart', e => {
    aboutTouchStartX = e.changedTouches[0].screenX;
    stopAutoplay(); // Hentikan pergantian otomatis saat disentuh
  }, {passive: true});
  
  frame.addEventListener('touchend', e => {
    aboutTouchEndX = e.changedTouches[0].screenX;
    handleAboutSwipe();
    startAutoplay(); // Lanjutkan putar otomatis setelah dilepas
  }, {passive: true});
  
  function handleAboutSwipe() {
    const swipeDistance = aboutTouchEndX - aboutTouchStartX;
    const minDistance = 40; // Sensitivitas geser
    
    if (swipeDistance < -minDistance) {
      next(); // Geser ke kiri -> foto selanjutnya
    } else if (swipeDistance > minDistance) {
      prev(); // Geser ke kanan -> foto sebelumnya
    }
  }
  /* =========================================== */

  startAutoplay();
})();

// ===== 10. ACCORDION "ABOUT US" WITH TOGGLE SWITCH =====
(function(){
  const accordionItems = document.querySelectorAll('.about-grid .accordion-item');
  const toggleInput = document.getElementById('accordionToggle');
  const toggleStatus = document.getElementById('toggleStatus');

  if (accordionItems.length === 0) return;

  // 1. Logika untuk mengubah teks label (Disabled / Enabled) saat sakelar diklik
  if (toggleInput && toggleStatus) {
    toggleInput.addEventListener('change', function() {
      if (this.checked) {
        toggleStatus.textContent = 'Enabled';
        toggleStatus.style.color = 'var(--blue-deep)';
      } else {
        toggleStatus.textContent = 'Disabled';
        toggleStatus.style.color = 'var(--muted)';
      }
    });
  }

  // 2. Logika membuka/menutup item accordion
  accordionItems.forEach(item => {
    item.addEventListener('toggle', function () {
      const isAlwaysOpenEnabled = toggleInput && toggleInput.checked;

      // Jika fitur 'Column remains open' DISABLED (default):
      // Hanya tutup item lain jika item yang ini BARU SAJA dibuka
      if (this.open && !isAlwaysOpenEnabled) {
        accordionItems.forEach(other => {
          if (other !== this && other.hasAttribute('open')) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });
})();

// ===== IMAGE FOCUS MODE (CENTER ZOOM & CAPTION VIA CLONE) =====
(function() {
  const overlay = document.getElementById('focusOverlay');
  const projectTrack = document.getElementById('projectTrack');

  if (!overlay || !projectTrack) return;

  let activeClone = null;
  let activeCaption = null; // Menyimpan elemen teks caption
  let startScrollY = 0;

  projectTrack.addEventListener('click', (e) => {
    const imgWrapper = e.target.closest('.card-image-wrapper');
    if (!imgWrapper) return;

    if (activeClone) {
      closeFocus();
      return;
    }

    // A. Ambil Data Teks dari Kartu yang Diklik
    const card = imgWrapper.closest('.project-card');
    const titleText = card.querySelector('.card-title-row h4').innerText;
    const descText = card.querySelector('.card-dropdown-content p').innerText;

    // B. Ambil Posisi Gambar Asli
    const rect = imgWrapper.getBoundingClientRect();

    // C. Buat Clone Gambar
    activeClone = imgWrapper.cloneNode(true);
    const textOverlay = activeClone.querySelector('.image-overlay');
    if (textOverlay) textOverlay.style.display = 'none';
    
    // --- TAMBAHAN BARU: Masukkan class CSS agar gambar tampil utuh ---
    activeClone.classList.add('show-full');

    activeClone.style.position = 'fixed';
    activeClone.style.top = rect.top + 'px';
    activeClone.style.left = rect.left + 'px';
    activeClone.style.width = rect.width + 'px';
    activeClone.style.height = rect.height + 'px';
    activeClone.style.margin = '0';
    activeClone.style.zIndex = '99999';
    activeClone.style.cursor = 'zoom-out';
    activeClone.style.boxShadow = '0 25px 60px rgba(0,0,0,0.9)';
    activeClone.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease';

    document.body.appendChild(activeClone);

    // D. Buat dan Masukkan Elemen Caption
    activeCaption = document.createElement('div');
    activeCaption.className = 'focus-caption';
    activeCaption.innerHTML = `<h4>${titleText}</h4><p>${descText}</p>`;
    document.body.appendChild(activeCaption);

    // E. Tampilkan Latar Gelap
    overlay.classList.add('active');
    overlay.style.opacity = '1';

    // F. PERHITUNGAN MATEMATIKA: Bawa Gambar ke Tengah Layar
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const cloneCenterX = rect.left + (rect.width / 2);
    const cloneCenterY = rect.top + (rect.height / 2);
    
    const translateX = centerX - cloneCenterX;
    const translateY = centerY - cloneCenterY - 40; // Sisakan ruang sedikit untuk caption

    // Pancing browser merender posisi
    activeClone.getBoundingClientRect();

    // G. Animasi ke Tengah & Skala Presisi (Diperbarui)
    // Menghitung batas maksimal gambar sebesar 85% dari lebar dan 70% dari tinggi layar
    const scaleX = (window.innerWidth * 0.85) / rect.width;
    const scaleY = (window.innerHeight * 0.70) / rect.height;
    
    // Gunakan skala terkecil agar seluruh gambar pasti muat di dalam layar tanpa terpotong
    const zoomScale = Math.min(scaleX, scaleY);

    activeClone.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`;
    activeCaption.classList.add('show');

    startScrollY = window.scrollY;
    window.addEventListener('scroll', handleScrollFade);

    activeClone.addEventListener('click', closeFocus);
  });

  overlay.addEventListener('click', closeFocus);

  function handleScrollFade() {
    if (!activeClone) return;
    const scrollDistance = Math.abs(window.scrollY - startScrollY);
    const fadeThreshold = 120;
    let newOpacity = 1 - (scrollDistance / fadeThreshold);

    if (newOpacity <= 0) {
      closeFocus();
    } else {
      overlay.style.opacity = newOpacity;
      activeClone.style.opacity = newOpacity;
      if (activeCaption) activeCaption.style.opacity = newOpacity;
    }
  }

  function closeFocus() {
    if (activeClone) {
      // Animasi kembalikan ke tempat asal
      activeClone.style.transform = 'translate(0px, 0px) scale(1)';
      activeClone.style.opacity = '0';
      if (activeCaption) activeCaption.classList.remove('show');

      // Hapus elemen clone dan caption setelah animasi CSS selesai
      const cloneToRemove = activeClone;
      const captionToRemove = activeCaption;
      setTimeout(() => {
        if (cloneToRemove && cloneToRemove.parentNode) cloneToRemove.parentNode.removeChild(cloneToRemove);
        if (captionToRemove && captionToRemove.parentNode) captionToRemove.parentNode.removeChild(captionToRemove);
      }, 400);

      activeClone = null;
      activeCaption = null;
    }
    
    overlay.classList.remove('active');
    overlay.style.opacity = '0';
    window.removeEventListener('scroll', handleScrollFade);
  }
})();

// ===== 11. MOBILE HAMBURGER MENU LOGIC =====
document.addEventListener('DOMContentLoaded', function() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const headerNav = document.getElementById('headerNav');

  if (menuBtn && headerNav) {
    // 1. Fungsi saat tombol hamburger diklik
    menuBtn.addEventListener('click', function() {
      menuBtn.classList.toggle('active'); // Ubah hamburger jadi X
      headerNav.classList.toggle('active'); // Geser menu ke layar
    });

    // 2. Fungsi otomatis menutup menu saat salah satu link diklik
    const navLinks = headerNav.querySelectorAll('a');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        menuBtn.classList.remove('active');
        headerNav.classList.remove('active');
      });
    });
  }
});

// ===== 12. BACK TO TOP BUTTON LOGIC =====
(function() {
  const backToTopBtn = document.getElementById('backToTop');

  if (backToTopBtn) {
    // 1. Munculkan tombol saat layar di-scroll ke bawah lebih dari 400px
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });

    // 2. Gulirkan layar kembali ke paling atas saat tombol diklik
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
})();
//cuma buat final tulisan di github