/**
 * diet-database.js
 * Database di pasti "di base" (per una porzione standard), usato dal
 * generatore del piano settimanale. I valori nutrizionali sono stime
 * indicative, non da laboratorio: servono a costruire un piano plausibile,
 * non un referto medico. L'utente può sempre modificare/sostituire ogni
 * pasto a mano (anche con un piano dato da un/a nutrizionista vero).
 *
 * contiene: tag usati per escludere automaticamente i pasti in base alle
 * allergie/intolleranze indicate nel profilo.
 */
const DatabaseDieta = (function () {
  const PASTI = [
    // ---- COLAZIONE ----
    { id: 'c1', nome: 'Yogurt greco con miele e noci', categoria: 'colazione', kcal: 320, proteine: 18, carboidrati: 28, grassi: 14, contiene: ['lattosio', 'frutta_secca'] },
    { id: 'c2', nome: 'Fette biscottate integrali con marmellata e latte', categoria: 'colazione', kcal: 280, proteine: 9, carboidrati: 48, grassi: 6, contiene: ['glutine', 'lattosio'] },
    { id: 'c3', nome: 'Uova strapazzate con pane integrale', categoria: 'colazione', kcal: 350, proteine: 22, carboidrati: 30, grassi: 16, contiene: ['uova', 'glutine'] },
    { id: 'c4', nome: 'Porridge di avena con frutta fresca', categoria: 'colazione', kcal: 300, proteine: 10, carboidrati: 50, grassi: 7, contiene: ['glutine'] },
    { id: 'c5', nome: 'Smoothie proteico con banana e latte', categoria: 'colazione', kcal: 280, proteine: 25, carboidrati: 35, grassi: 5, contiene: ['lattosio'] },
    { id: 'c6', nome: 'Pancake proteici con frutti di bosco', categoria: 'colazione', kcal: 340, proteine: 24, carboidrati: 38, grassi: 10, contiene: ['uova', 'glutine', 'lattosio'] },
    { id: 'c7', nome: 'Toast con avocado e uovo in camicia', categoria: 'colazione', kcal: 380, proteine: 16, carboidrati: 32, grassi: 20, contiene: ['uova', 'glutine'] },
    { id: 'c8', nome: 'Macedonia di frutta fresca con semi di chia', categoria: 'colazione', kcal: 220, proteine: 5, carboidrati: 40, grassi: 6, contiene: [] },

    // ---- PRANZO ----
    { id: 'p1', nome: 'Pasta integrale al pomodoro e tonno', categoria: 'pranzo', kcal: 520, proteine: 32, carboidrati: 65, grassi: 12, contiene: ['glutine', 'pesce'] },
    { id: 'p2', nome: 'Riso basmati con pollo e verdure saltate', categoria: 'pranzo', kcal: 480, proteine: 38, carboidrati: 55, grassi: 10, contiene: [] },
    { id: 'p3', nome: 'Insalata di quinoa, ceci e feta', categoria: 'pranzo', kcal: 450, proteine: 20, carboidrati: 50, grassi: 16, contiene: ['lattosio'] },
    { id: 'p4', nome: 'Petto di pollo grigliato con patate al forno', categoria: 'pranzo', kcal: 500, proteine: 40, carboidrati: 45, grassi: 14, contiene: [] },
    { id: 'p5', nome: 'Farro con verdure grigliate e mozzarella', categoria: 'pranzo', kcal: 460, proteine: 18, carboidrati: 55, grassi: 14, contiene: ['glutine', 'lattosio'] },
    { id: 'p6', nome: 'Salmone al forno con riso e broccoli', categoria: 'pranzo', kcal: 550, proteine: 36, carboidrati: 45, grassi: 20, contiene: ['pesce'] },
    { id: 'p7', nome: 'Zuppa di legumi misti con pane integrale', categoria: 'pranzo', kcal: 420, proteine: 22, carboidrati: 60, grassi: 8, contiene: ['glutine'] },
    { id: 'p8', nome: 'Poke bowl con tonno, riso e avocado', categoria: 'pranzo', kcal: 490, proteine: 30, carboidrati: 50, grassi: 16, contiene: ['pesce'] },
    { id: 'p9', nome: 'Cous cous con verdure e gamberi', categoria: 'pranzo', kcal: 470, proteine: 28, carboidrati: 58, grassi: 12, contiene: ['glutine', 'crostacei'] },

    // ---- CENA ----
    { id: 'd1', nome: 'Frittata di verdure con insalata mista', categoria: 'cena', kcal: 380, proteine: 22, carboidrati: 12, grassi: 26, contiene: ['uova'] },
    { id: 'd2', nome: 'Vellutata di legumi e verdure', categoria: 'cena', kcal: 320, proteine: 16, carboidrati: 45, grassi: 6, contiene: [] },
    { id: 'd3', nome: 'Petto di tacchino con verdure saltate', categoria: 'cena', kcal: 380, proteine: 35, carboidrati: 20, grassi: 15, contiene: [] },
    { id: 'd4', nome: 'Merluzzo al vapore con patate lesse', categoria: 'cena', kcal: 350, proteine: 30, carboidrati: 35, grassi: 8, contiene: ['pesce'] },
    { id: 'd5', nome: 'Insalatona con tonno, uova e verdure', categoria: 'cena', kcal: 400, proteine: 28, carboidrati: 15, grassi: 24, contiene: ['pesce', 'uova'] },
    { id: 'd6', nome: 'Hamburger di ceci con verdure grigliate', categoria: 'cena', kcal: 420, proteine: 18, carboidrati: 45, grassi: 16, contiene: [] },
    { id: 'd7', nome: 'Tofu saltato con verdure e riso', categoria: 'cena', kcal: 400, proteine: 22, carboidrati: 45, grassi: 12, contiene: ['soia'] },
    { id: 'd8', nome: 'Bresaola con rucola, grana e limone', categoria: 'cena', kcal: 300, proteine: 32, carboidrati: 4, grassi: 18, contiene: ['lattosio'] },

    // ---- SPUNTINO ----
    { id: 's1', nome: 'Frutta fresca di stagione', categoria: 'spuntino', kcal: 80, proteine: 1, carboidrati: 20, grassi: 0, contiene: [] },
    { id: 's2', nome: 'Yogurt greco naturale', categoria: 'spuntino', kcal: 130, proteine: 12, carboidrati: 8, grassi: 5, contiene: ['lattosio'] },
    { id: 's3', nome: 'Manciata di mandorle', categoria: 'spuntino', kcal: 170, proteine: 6, carboidrati: 6, grassi: 15, contiene: ['frutta_secca'] },
    { id: 's4', nome: 'Barretta proteica', categoria: 'spuntino', kcal: 200, proteine: 20, carboidrati: 18, grassi: 7, contiene: ['lattosio', 'frutta_secca'] },
    { id: 's5', nome: 'Hummus di ceci con carote', categoria: 'spuntino', kcal: 150, proteine: 5, carboidrati: 15, grassi: 8, contiene: [] },
    { id: 's6', nome: 'Toast integrale con marmellata', categoria: 'spuntino', kcal: 180, proteine: 4, carboidrati: 32, grassi: 4, contiene: ['glutine'] }
  ];

  const ALLERGENI = [
    { id: 'glutine', nome: 'Glutine' },
    { id: 'lattosio', nome: 'Lattosio' },
    { id: 'uova', nome: 'Uova' },
    { id: 'pesce', nome: 'Pesce' },
    { id: 'crostacei', nome: 'Crostacei' },
    { id: 'frutta_secca', nome: 'Frutta secca' },
    { id: 'soia', nome: 'Soia' },
    { id: 'arachidi', nome: 'Arachidi' }
  ];

  const CATEGORIE = ['colazione', 'spuntino1', 'pranzo', 'spuntino2', 'cena'];
  const ETICHETTE_CATEGORIA = { colazione: 'Colazione', spuntino1: 'Spuntino', pranzo: 'Pranzo', spuntino2: 'Spuntino', cena: 'Cena' };

  // Combinazioni per numero di pasti al giorno scelto dall'utente (3-6).
  const PRESET_NUMERO_PASTI = {
    3: { categorie: ['colazione', 'pranzo', 'cena'], quote: { colazione: 0.30, pranzo: 0.40, cena: 0.30 } },
    4: { categorie: ['colazione', 'pranzo', 'spuntino1', 'cena'], quote: { colazione: 0.25, pranzo: 0.35, spuntino1: 0.10, cena: 0.30 } },
    5: { categorie: ['colazione', 'spuntino1', 'pranzo', 'spuntino2', 'cena'], quote: { colazione: 0.25, spuntino1: 0.08, pranzo: 0.34, spuntino2: 0.08, cena: 0.25 } },
    6: { categorie: ['colazione', 'spuntino1', 'pranzo', 'spuntino2', 'cena', 'spuntino3'], quote: { colazione: 0.22, spuntino1: 0.08, pranzo: 0.30, spuntino2: 0.08, cena: 0.22, spuntino3: 0.10 } }
  };
  const ETICHETTE_CATEGORIA_ESTESA = Object.assign({ spuntino3: 'Spuntino' }, ETICHETTE_CATEGORIA);

  function perNumeroPasti(numero) {
    return PRESET_NUMERO_PASTI[numero] || PRESET_NUMERO_PASTI[5];
  }

  // Quota indicativa di calorie giornaliere per ciascuna categoria (retro-compatibilità, piano a 5 pasti)
  const QUOTA_CATEGORIA = PRESET_NUMERO_PASTI[5].quote;

  function perCategoria(categoriaBase) {
    return PASTI.filter(p => p.categoria === categoriaBase);
  }

  return { PASTI, ALLERGENI, CATEGORIE, ETICHETTE_CATEGORIA: ETICHETTE_CATEGORIA_ESTESA, QUOTA_CATEGORIA, perCategoria, perNumeroPasti, PRESET_NUMERO_PASTI };
})();

window.DatabaseDieta = DatabaseDieta;
