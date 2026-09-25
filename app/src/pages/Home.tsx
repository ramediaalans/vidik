import { useState } from 'react';
import { asset } from '../media/asset';
import { Link } from 'react-router-dom';
import { Marquee, SectionHeader } from '../components/core';
import { MediaCard } from '../components/MediaCard';
import { MediaViewer } from '../components/MediaViewer';
import {
  CassettePlayer,
  NostalgiaGenerator,
  RetroComputer,
  RetroTV,
  YearSelector
} from '../components/interactive';
import { movies, cartoons, games, music } from '../data/catalog';
import { marqueeLines, stories } from '../data/extra';
import type { CatalogItem } from '../media/types';

const TILES = [
  {
    to: '/videosalon',
    label: 'Видеосалон',
    note: 'Полка кассет — бери и смотри',
    image: '/images/movies/section-movies.webp',
    alt: 'Полки видеопроката'
  },
  {
    to: '/disney-klub',
    label: 'Дисней-клуб',
    note: 'Воскресный блок мультсериалов',
    image: '/images/cartoons/section-cartoons.webp',
    alt: 'Телевизор с мультфильмом'
  },
  {
    to: '/igry',
    label: 'Игры',
    note: 'Картриджи, Sega и компьютерные клубы',
    image: '/images/games/section-games.webp',
    alt: 'Приставка и картриджи'
  },
  {
    to: '/muzyka',
    label: 'Музыка',
    note: 'Кассеты, плееры и перезапись',
    image: '/images/music/section-music.webp',
    alt: 'Магнитофон и кассеты'
  }
];

export function Home() {
  const [active, setActive] = useState<CatalogItem | null>(null);
  const best = [movies[0], cartoons[0], games[2], music[1], movies[4], games[5]];

  return (
    <>
      <section className="hero vignette">
        <div className="hero__media">
          <img
            src={asset('/images/hero/hero-room.webp')}
            alt="Комната 90-х с телевизором, ковром и приставкой"
            fetchPriority="high"
          />
        </div>
        <div className="hero__inner container">
          <div className="hero__kicker pixel">1990 — 2005 · архив памяти</div>
          <h1 className="display display--xl hero__title">Твоё детство на перемотке</h1>
          <p className="lead">
            Помнишь, как выглядел вечер после школы? Телевизор греется, кассета перемотана,
            приставка на третьем канале. Мы собрали этот вечер заново — и сделали его интерактивным.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" to="/televizor">
              Включить телевизор
            </Link>
            <Link className="btn" to="/nostalgiya">
              Собрать свой вечер
            </Link>
          </div>
          <div className="hero__meta">
            <div>
              <b>6</b>
              <span className="mono">каналов</span>
            </div>
            <div>
              <b>49</b>
              <span className="mono">фильмов и сериалов целиком</span>
            </div>
            <div>
              <b>6</b>
              <span className="mono">интерактивных штук</span>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={marqueeLines} />

      <section className="section container">
        <SectionHeader
          index="00 · Где мы сейчас"
          title="Выбери комнату"
          note="Весь сайт — одна квартира: телевизор, полка с кассетами, приставка на ковре и магнитофон на кухне."
        />
        <div className="grid grid--4">
          {TILES.map((t) => (
            <Link className="tile" to={t.to} key={t.to}>
              <img src={asset(t.image)} alt={t.alt} loading="lazy" />
              <div className="tile__content">
                <h3 className="display display--m">{t.label}</h3>
                <p className="mono" style={{ marginTop: 6 }}>{t.note}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <SectionHeader
          index="01 · Телевизор"
          title="Переключи канал"
          note="Шесть каналов, как тогда: мультфильмы, кино, музыка, передачи, реклама и приставка."
          action={
            <Link className="btn" to="/televizor">
              Полная программа
            </Link>
          }
        />
        <RetroTV />
      </section>

      <section className="section container">
        <SectionHeader
          index="02 · Архив"
          title="Что смотрели и во что играли"
          note="Заметки и кадры из архива памяти — без плеера, просто чтобы вспомнить."
          action={
            <Link className="btn" to="/poisk">
              Искать по архиву
            </Link>
          }
        />
        <div className="grid grid--3">
          {best.map((item) => (
            <MediaCard key={item.id} item={item} onOpen={setActive} />
          ))}
        </div>
      </section>

      <section className="section container">
        <SectionHeader
          index="03 · Генератор"
          title="Собери свой вечер"
          note="Выбери годы и место — получишь свою подборку на вечер."
        />
        <NostalgiaGenerator onOpen={setActive} />
      </section>

      <section className="section container">
        <SectionHeader index="04 · Год" title="Вернуться в 1999" note="Один год — одна карточка памяти." action={<Link className="btn" to="/po-godam">Все годы</Link>} />
        <YearSelector />
      </section>

      <section className="section container">
        <SectionHeader
          index="05 · Магнитофон"
          title="Поставь кассету"
          note="Сборник, который записывали с радио и с чужих кассет."
        />
        <CassettePlayer />
      </section>

      <section className="section container">
        <SectionHeader
          index="06 · Компьютер"
          title="Включи системник"
          note="Рабочий стол, с которого начинался домашний интернет."
        />
        <RetroComputer />
      </section>

      <section className="section container">
        <SectionHeader
          index="07 · Истории"
          title="Короткие тексты о быте"
          action={
            <Link className="btn" to="/istorii">
              Все истории
            </Link>
          }
        />
        <div className="grid grid--3">
          {stories.slice(0, 3).map((s) => (
            <Link key={s.id} className="card" to="/istorii">
              <div className="card__media">
                <img src={asset(s.image)} alt={s.alt} loading="lazy" />
              </div>
              <div className="card__body">
                <h3 className="card__title">{s.title}</h3>
                <p className="card__desc">{s.excerpt}</p>
                <div className="card__foot">
                  <span className="mono">{s.readTime}</span>
                  <span className="mono">Читать →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {active ? <MediaViewer item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
