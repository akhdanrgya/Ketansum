"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { ArrowUpRight, ArrowDown, Pause, Play } from "lucide-react";
import { ProductArt } from "./product-art";
import { rupiah } from "@/lib/finance";
import { initialSettings, isDemo } from "@/lib/data";
import type { PublicProduct } from "@/lib/types";
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};
export function Landing({
  products,
  settings = initialSettings,
}: {
  products: PublicProduct[];
  settings?: typeof initialSettings;
}) {
  const [category, setCategory] = useState("Semua");
  const [paused, setPaused] = useState(false);
  const [list, setList] = useState(products);
  const [content, setContent] = useState(settings);
  useEffect(() => {
    if (isDemo) {
      try {
        const raw = localStorage.getItem("ketansum-demo-v1");
        if (raw) {
          const state = JSON.parse(raw);
          setList(state.products.filter((p: PublicProduct) => p.active));
          setContent(state.settings);
        }
      } catch {
        /* Keep public seed if local storage is unavailable. */
      }
    }
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div className={`site ${paused ? "paused" : ""}`}>
        <div className="checker" />
        <header className="public-nav wrap">
          <Link href="/" className="wordmark">
            ketansum<span>★</span>
          </Link>
          <nav>
            <a href="#menu">Menu kita</a>
            <a href="#cerita">Cerita kita</a>
            <a href="#portfolio">Portfolio</a>
          </nav>
          <a className="button small cream" href="#menu">
            Lagi laper? <ArrowUpRight size={17} />
          </a>
        </header>
        <main>
          <section className="hero wrap">
            <motion.div {...reveal} className="hero-copy">
              <span className="eyebrow light">
                <span className="dot" /> KETAN SUSU + DIMSUM = KETANSUM
              </span>
              <h1>
                MANISNYA
                <br />
                <span className="yellow">KETAN.</span>
                <br />
                GURIHNYA
                <br />
                <span className="pink">DIMSUM.</span>
              </h1>
              <p>
                Dua favorit, satu tempat. Dari yang manis sampai yang pedas, ada
                rasa buat setiap mood kamu.
              </p>
              <a href="#menu" className="button yellow-bg">
                Temuin favoritmu <ArrowUpRight />
              </a>
              <span className="hero-note">Jajan enak, bikin happy!</span>
            </motion.div>
            <motion.div
              className="hero-visual"
              initial={{ opacity: 0, rotate: 5, scale: 0.9 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <span className="burst">
                ADA JUALAN
                <br />
                <strong>APA NIH?!</strong>
              </span>
              <div className="hero-food">
                <ProductArt art={1} name="Ketan susu keju Ketansum" />
              </div>
              <div className="hero-second">
                <ProductArt art={5} name="Dimsum chilli oil Ketansum" />
              </div>
              <span className="price-sticker">
                MULAI DARI<strong>10K</strong>
              </span>
              <span className="star-decoration">✦</span>
              <span className="scribble">
                manis & gurih
                <br />
                best duo ever ↗
              </span>
            </motion.div>
            <a href="#menu" className="scroll-note">
              <ArrowDown size={16} /> SCROLL DULU, LAPAR KEMUDIAN
            </a>
          </section>
          <div className="ticker" aria-hidden="true">
            <div>
              KETAN PULEN ✦ DIMSUM GURIH ✦ DIBIKIN DENGAN HATI ✦ KETANSUM ✦
              KETAN PULEN ✦ DIMSUM GURIH ✦ DIBIKIN DENGAN HATI ✦ KETANSUM ✦
            </div>
          </div>
          <section id="menu" className="menu-section">
            <div className="wrap">
              <motion.div {...reveal} className="section-heading">
                <div>
                  <span className="eyebrow">PILIH TIM KAMU</span>
                  <h2>
                    Susah milih?
                    <br />
                    <span className="outline-text">Cobain dua-duanya.</span>
                  </h2>
                </div>
                <p>
                  Manis, gurih, atau sedikit pedas.
                  <br />
                  Favorit baru kamu ada di sini.
                </p>
              </motion.div>
              <div className="filters" aria-label="Kategori menu">
                {["Semua", "Ketan Susu", "Dimsum"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={category === c ? "active" : ""}
                  >
                    {c}
                    {c === "Semua" ? " ✦" : ""}
                  </button>
                ))}
              </div>
              <motion.div layout className="product-grid">
                {list
                  .filter(
                    (p) => category === "Semua" || p.category === category,
                  )
                  .map((p, i) => (
                    <motion.article
                      layout
                      {...reveal}
                      key={p.id}
                      className={`menu-card card-${i % 3}`}
                      whileHover={{ y: -7, rotate: i % 2 ? 1 : -1 }}
                    >
                      <div key="art" className="card-art">
                        <ProductArt art={p.art} name={p.name} image={p.image} />
                        <span className="category-tag">
                          {p.category === "Dimsum" ? "TIM GURIH" : "TIM MANIS"}
                        </span>
                        <span className="mini-star">✦</span>
                      </div>
                      <div key="copy" className="card-copy">
                        <h3>{p.name}</h3>
                        <p>{p.description}</p>
                        <div className="card-bottom">
                          <strong>{rupiah(p.price)}</strong>
                          <span>
                            {p.available ? "Siap bikin happy ↗" : "Lagi habis"}
                          </span>
                        </div>
                      </div>
                    </motion.article>
                  ))}
              </motion.div>
            </div>
          </section>
          <section id="cerita" className="story-section">
            <div className="wrap story-grid">
              <motion.div {...reveal} className="story-poster">
                <img
                  src="/poster-ketansum.jpg"
                  alt="Poster asli Ketansum: menu ketan susu dan dimsum"
                  loading="lazy"
                />
                <span className="tape" />
                <span className="story-sticker">
                  SMALL BUSINESS,
                  <br />
                  BIG APPETITE!
                </span>
              </motion.div>
              <motion.div {...reveal}>
                <span className="eyebrow">BUKAN CUMA JUALAN</span>
                <h2>
                  Dari tugas,
                  <br />
                  jadi <em>cerita.</em>
                </h2>
                <p>{content.story}</p>
                <div className="story-points">
                  <span>
                    01 <strong>Ide sederhana</strong>
                  </span>
                  <span>
                    02 <strong>Rasa yang dekat</strong>
                  </span>
                  <span>
                    03 <strong>Belajar bareng</strong>
                  </span>
                </div>
                {content.team && (
                  <p className="team-text">Tim Ketansum: {content.team}</p>
                )}
                <a href="#portfolio" className="text-link">
                  Kenalan lebih jauh <ArrowUpRight />
                </a>
              </motion.div>
            </div>
          </section>
          <section id="portfolio" className="portfolio wrap">
            <motion.div {...reveal} className="section-heading">
              <div>
                <span className="eyebrow light">CATATAN KEWIRAUSAHAAN</span>
                <h2>
                  Di balik setiap
                  <br />
                  porsi Ketansum.
                </h2>
              </div>
              <span className="portfolio-star">✳</span>
            </motion.div>
            <div className="journey-grid">
              {[
                [
                  "01",
                  "Meracik ide",
                  "Menggabungkan ketan susu dan dimsum dalam satu brand yang penuh warna.",
                ],
                [
                  "02",
                  "Menjalankan usaha",
                  "Belajar menyiapkan produk, melayani pembeli, dan mencatat setiap penjualan.",
                ],
                ["03", "Belajar & bertumbuh", content.reflection],
              ].map(([n, title, body]) => (
                <motion.article {...reveal} key={n}>
                  <span key="number" className="journey-number">
                    {n}
                  </span>
                  <h3 key="title">{title}</h3>
                  <p key="body">{body}</p>
                </motion.article>
              ))}
            </div>
          </section>
          <section id="kontak" className="contact-section">
            <div className="wrap">
              <span className="eyebrow">PERUT HAPPY, HARI HAPPY</span>
              <h2>
                Jadi, kamu
                <br />
                tim <span>yang mana?</span>
              </h2>
              {content.contact ? (
                <a
                  className="button red-bg"
                  href={`https://wa.me/${content.contact.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pesan ke Ketansum <ArrowUpRight />
                </a>
              ) : (
                <a className="button red-bg" href="#menu">
                  Lihat menu dulu <ArrowUpRight />
                </a>
              )}
              <span className="contact-star">✦</span>
            </div>
          </section>
        </main>
        <footer className="wrap">
          <Link className="wordmark" href="/">
            ketansum<span>★</span>
          </Link>
          <span>Project kewirausahaan · Dibuat dengan rasa.</span>
          <Link href="/login">
            Ruang tim <ArrowUpRight size={14} />
          </Link>
        </footer>
        <div className="checker" />
        <button
          className="motion-toggle"
          onClick={() => setPaused(!paused)}
          aria-label={
            paused ? "Aktifkan animasi dekorasi" : "Jeda animasi dekorasi"
          }
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </MotionConfig>
  );
}
