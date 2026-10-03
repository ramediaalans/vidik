import { PageHero } from '../v2/PageHero';
import { CartridgeShelf } from '../components/CartridgeShelf';

export function GamesPage() {
  return (
    <>
      <PageHero
        index="14:10"
        time="14:10"
        kicker="04 · Приставка"
        title="Картриджи и клубы"
        lead="От «9999 в 1» с одними и теми же играми до Сеги, которую давали на выходные."
        image="/images/v2/ch-games.webp"
        alt="Приставка, подключённая к телевизору, и картриджи на ковре днём"
      />
      <CartridgeShelf />
    </>
  );
}
