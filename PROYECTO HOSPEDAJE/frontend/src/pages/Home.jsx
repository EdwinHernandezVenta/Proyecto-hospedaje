import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="pr-home">

      {/* ================= NAVBAR ================= */}

      <header className="pr-navbar">

        <Link to="/" className="pr-brand">
          <div className="pr-brand-symbol">
            PR
          </div>

          <div className="pr-brand-text">
            <strong>PAIE ROYALE</strong>
            <span>HOTEL & RESORT</span>
          </div>
        </Link>

        <nav className="pr-nav">
          <a href="#inicio">Inicio</a>
          <a href="#habitaciones">Habitaciones</a>
          <a href="#experiencias">Experiencias</a>
          <a href="#servicios">Servicios</a>
        </nav>

        <Link to="/login" className="pr-login">
          Iniciar sesión
        </Link>

      </header>


      {/* ================= HERO ================= */}

      <main>

        <section className="pr-hero" id="inicio">

          <div className="pr-hero-background">
            <div className="pr-glow pr-glow-one"></div>
            <div className="pr-glow pr-glow-two"></div>
            <div className="pr-grid"></div>
          </div>

          <div className="pr-hero-content">

            <div className="pr-label">
              UNA EXPERIENCIA EXTRAORDINARIA
            </div>

            <h1>
              El lujo
              <br />
              <span>tiene un nuevo destino.</span>
            </h1>

            <p>
              Descubre PAIE ROYALE, un espacio creado para
              quienes buscan descanso, elegancia y una
              experiencia diferente.
            </p>

            <div className="pr-buttons">

              <Link
                to="/login"
                className="pr-button-primary"
              >
                Reservar ahora
                <span>→</span>
              </Link>

              <Link
                to="/registro"
                className="pr-button-secondary"
              >
                Crear cuenta
              </Link>

            </div>

          </div>


          {/* OBJETO 3D DECORATIVO */}

          <div className="pr-hero-object">

            <div className="pr-orbit pr-orbit-one"></div>
            <div className="pr-orbit pr-orbit-two"></div>

            <div className="pr-glass-card">

              <div className="pr-card-top">
                <span>PR</span>
                <span>ROYAL COLLECTION</span>
              </div>

              <div className="pr-card-center">
                <div className="pr-card-circle">
                  PR
                </div>
              </div>

              <div className="pr-card-bottom">
                <strong>PAIE ROYALE</strong>
                <span>EST. 2026</span>
              </div>

            </div>

          </div>


          <div className="pr-scroll">
            <span></span>
            SCROLL TO DISCOVER
          </div>

        </section>


        {/* ================= INTRO ================= */}

        <section className="pr-intro">

          <div className="pr-intro-title">

            <div className="pr-label">
              PAIE ROYALE
            </div>

            <h2>
              Más que una estancia.
              <br />
              <span>Una experiencia.</span>
            </h2>

          </div>

          <div className="pr-intro-text">
            <p>
              Cada detalle de PAIE ROYALE está pensado para
              ofrecer una experiencia sofisticada, cómoda y
              memorable.
            </p>

            <p>
              Descansa, disfruta y deja que nosotros nos
              encarguemos del resto.
            </p>
          </div>

        </section>


        {/* ================= HABITACIONES ================= */}

        <section
          className="pr-rooms"
          id="habitaciones"
        >

          <div className="pr-section-header">

            <div>
              <div className="pr-label">
                ALOJAMIENTO
              </div>

              <h2>
                Habitaciones diseñadas
                <br />
                <span>para ti.</span>
              </h2>
            </div>

            <div className="pr-section-number">
              01 / 03
            </div>

          </div>


          <div className="pr-room-grid">

            <article className="pr-room pr-room-large">

              <div className="pr-room-image pr-room-image-one"></div>

              <div className="pr-room-content">

                <span>01</span>

                <h3>Royal Suite</h3>

                <p>
                  Elegancia, amplitud y máximo confort.
                </p>

                <Link to="/login">
                  Descubrir habitación →
                </Link>

              </div>

            </article>


            <article className="pr-room">

              <div className="pr-room-image pr-room-image-two"></div>

              <div className="pr-room-content">

                <span>02</span>

                <h3>Executive Room</h3>

                <p>
                  Diseño contemporáneo para una estancia única.
                </p>

                <Link to="/login">
                  Descubrir →
                </Link>

              </div>

            </article>


            <article className="pr-room">

              <div className="pr-room-image pr-room-image-three"></div>

              <div className="pr-room-content">

                <span>03</span>

                <h3>Deluxe Room</h3>

                <p>
                  Un refugio pensado para relajarte.
                </p>

                <Link to="/login">
                  Descubrir →
                </Link>

              </div>

            </article>

          </div>

        </section>


        {/* ================= EXPERIENCIAS ================= */}

        <section
          className="pr-experience"
          id="experiencias"
        >

          <div className="pr-experience-number">
            02
          </div>

          <div className="pr-experience-content">

            <div className="pr-label">
              EXPERIENCIAS
            </div>

            <h2>
              Donde cada momento
              <br />
              <span>se convierte en recuerdo.</span>
            </h2>

            <p>
              Vive una experiencia completa con espacios
              diseñados para descansar, compartir y disfrutar.
              PAIE ROYALE combina diseño, comodidad y atención
              en un solo lugar.
            </p>

            <Link
              to="/login"
              className="pr-experience-link"
            >
              Descubre PAIE ROYALE →
            </Link>

          </div>

          <div className="pr-experience-symbol">

            <div className="pr-symbol-ring">
              <span>PR</span>
            </div>

          </div>

        </section>


        {/* ================= SERVICIOS ================= */}

        <section
          className="pr-services"
          id="servicios"
        >

          <div className="pr-section-header">

            <div>

              <div className="pr-label">
                SERVICIOS
              </div>

              <h2>
                Todo lo que
                <br />
                <span>necesitas.</span>
              </h2>

            </div>

          </div>


          <div className="pr-service-grid">

            <article>
              <span>01</span>
              <div className="pr-service-icon">
                ✦
              </div>
              <h3>Restaurante</h3>
              <p>
                Sabores cuidadosamente seleccionados
                para nuestros huéspedes.
              </p>
            </article>

            <article>
              <span>02</span>
              <div className="pr-service-icon">
                ◈
              </div>
              <h3>Bienestar</h3>
              <p>
                Espacios creados para desconectar
                y recuperar energía.
              </p>
            </article>

            <article>
              <span>03</span>
              <div className="pr-service-icon">
                ◇
              </div>
              <h3>Experiencias</h3>
              <p>
                Momentos especiales diseñados para
                hacer de tu visita algo único.
              </p>
            </article>

            <article>
              <span>04</span>
              <div className="pr-service-icon">
                ✧
              </div>
              <h3>Atención Royale</h3>
              <p>
                Un servicio pensado alrededor de
                cada necesidad.
              </p>
            </article>

          </div>

        </section>


        {/* ================= FINAL ================= */}

        <section className="pr-final">

          <div className="pr-final-glow"></div>

          <div className="pr-label">
            TU PRÓXIMA EXPERIENCIA
          </div>

          <h2>
            Bienvenido a
            <br />
            <span>PAIE ROYALE.</span>
          </h2>

          <p>
            El lujo comienza con una decisión.
          </p>

          <Link
            to="/login"
            className="pr-button-primary"
          >
            Comenzar
            <span>→</span>
          </Link>

        </section>

      </main>


      {/* ================= FOOTER ================= */}

      <footer className="pr-footer">

        <div className="pr-brand">

          <div className="pr-brand-symbol">
            PR
          </div>

          <div className="pr-brand-text">
            <strong>PAIE ROYALE</strong>
            <span>HOTEL & RESORT</span>
          </div>

        </div>

        <p>
          © 2026 PAIE ROYALE. Todos los derechos reservados.
        </p>

      </footer>

    </div>
  );
}