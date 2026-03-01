export type Chapter = {
  id: number;
  title: string;
  paragraphs: string[];
};

export type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  chapters: Chapter[];
};

export const books: Book[] = [
  {
    id: "iliad",
    title: "Iliad",
    author: "Homer",
    description:
      "The epic poem of the Trojan War, focusing on the rage of Achilles and its devastating consequences for Greeks and Trojans alike.",
    chapters: [
      {
        id: 1,
        title: "Book I: The Rage of Achilles",
        paragraphs: [
          "Rage — Goddess, sing the rage of Peleus' son Achilles, murderous, doomed, that cost the Achaeans countless losses, hurling down to the House of Death so many sturdy souls, great fighters' souls, but made their bodies carrion, feasts for the dogs and birds, and the will of Zeus was moving toward its end.",
          "Begin, Muse, when the two first broke and clashed, Agamemnon lord of men and brilliant Achilles. What god drove them to fight with such a fury? Apollo the son of Zeus and Leto. Incensed at the king he swept a fatal plague through the army — men were dying and all because Agamemnon spurned Apollo's priest.",
          "Yes, Chryses approached the Achaeans' fast ships to win his daughter back, bringing a priceless ransom and bearing high in hand, wound on a golden staff, the wreaths of the god, the distant deadly Archer. He begged the whole Achaean army but most of all the two supreme commanders, Atreus' two sons.",
        ],
      },
      {
        id: 2,
        title: "Book II: The Great Gathering of Armies",
        paragraphs: [
          "Now the rest of the gods and men who fight in chariots slept the whole night through, but the sweet embrace of sleep could not hold Zeus. He was turning over in his mind how he might bring honor to Achilles and destroy great numbers beside the Achaean ships.",
          "As he pondered, the best plan seemed to be to send a deadly Dream to Agamemnon. He called out to the vision and addressed it with winged words: 'Go, deadly Dream, make your way to the fast Achaean ships.'",
          "The Dream went its way when it heard the command and quickly reached the Achaean ships. It sought out Agamemnon son of Atreus and found him sleeping in his shelter, with immortal sleep poured round him.",
        ],
      },
    ],
  },
  {
    id: "odyssey",
    title: "Odyssey",
    author: "Homer",
    description:
      "The journey of Odysseus as he struggles to return home after the fall of Troy, facing monsters, gods, and the limits of human endurance.",
    chapters: [
      {
        id: 1,
        title: "Book I: Athena Inspires the Prince",
        paragraphs: [
          "Sing to me of the man, Muse, the man of twists and turns driven time and again off course, once he had plundered the hallowed heights of Troy. Many cities of men he saw and learned their minds, many pains he suffered, heartsick on the open sea, fighting to save his life and bring his comrades home.",
          "But he could not save them from disaster, hard as he strove — the recklessness of their own ways destroyed them all, the blind fools, they devoured the cattle of the Sun and the Sungod blotted out the day of their return. Launch out on his story, Muse, daughter of Zeus, start from where you will.",
          "By now all the survivors, all who avoided headlong death, were safe at home, escaped the wars and waves. But one man alone, his heart set on his wife and his return — Calypso, the bewitching nymph, the lustrous goddess, held him back.",
        ],
      },
      {
        id: 2,
        title: "Book II: Telemachus Sets Sail",
        paragraphs: [
          "When young Dawn with her rose-red fingers shone once more, the true son of Odysseus sprang from bed and dressed, over his shoulder he slung his well-honed sword, fastened rawhide sandals under his smooth feet and strode from his bedroom, handsome as a god.",
          "At once he ordered heralds to cry out loud and clear and summon the flowing-haired Achaeans to full assembly. The criers called and the people came together quickly. When they had assembled, crowding the meeting grounds, Telemachus strode in too, a bronze spear in his grip.",
          "He took his seat in his father's place, and the senior chiefs gave way. The first to address the assembly was lord Aegyptius, bowed with age and wise beyond his years.",
        ],
      },
      {
        id: 3,
        title: "Book III: King Nestor Remembers",
        paragraphs: [
          "As the sun sprang up, leaving the brilliant waters in its wake, climbing the bronze sky to shower light on immortal gods and mortal men across the plowlands ripe with grain — the ship pulled into Pylos, Neleus' storied citadel.",
          "The people lined the beaches, sacrificing sleek black bulls to Poseidon, god of the sea-blue mane who shakes the earth. They sat in nine divisions, each five hundred strong, each division offering up nine bulls.",
          "Telemachus and his men drew in and furled their sails and moored their ship, then disembarked and Athena led the prince along. 'Telemachus,' she said, 'no more shyness now. You sailed the seas for this — to learn your father's fate.'",
        ],
      },
    ],
  },
  {
    id: "republic",
    title: "Republic",
    author: "Plato",
    description:
      "A Socratic dialogue exploring justice, the ideal state, and the nature of the philosopher — one of the most influential works in Western philosophy.",
    chapters: [
      {
        id: 1,
        title: "Book I: The Challenge of Justice",
        paragraphs: [
          "I went down yesterday to the Piraeus with Glaucon the son of Ariston, that I might offer up my prayers to the goddess, and also because I wanted to see in what manner they would celebrate the festival, which was a new thing. I was delighted with the procession of the inhabitants; but that of the Thracians was equally, if not more, beautiful.",
          "When we had finished our prayers and viewed the spectacle, we turned in the direction of the city; and at that instant Polemarchus the son of Cephalus chanced to catch sight of us from a distance as we were starting on our way home, and told his servant to run and bid us wait for him.",
          "'Allegory,' said Socrates, 'is the art of seeing the invisible through the visible. And justice — is it not the invisible order of the soul, made visible through the actions of men and the structure of their cities?'",
        ],
      },
      {
        id: 2,
        title: "Book II: The Ring of Gyges",
        paragraphs: [
          "With these words I was thinking that I had made an end of the discussion; but the end, in truth, proved to be only a beginning. For Glaucon, who is always the most pugnacious of men, was dissatisfied at Thrasymachus' retirement; he wanted to have the battle out.",
          "'Socrates,' he said, 'do you wish really to persuade us, or only to seem to have persuaded us, that to be just is always better than to be unjust?' I should wish really to persuade you, I replied, if I could.",
          "They say that to do injustice is, by nature, good; to suffer injustice, evil; but that the evil is greater than the good. And so when men have both done and suffered injustice and have had experience of both, any who are not able to avoid the one and obtain the other think they had better agree among themselves to have neither.",
        ],
      },
    ],
  },
  {
    id: "paradise-lost",
    title: "Paradise Lost",
    author: "John Milton",
    description:
      "The epic poem retelling humanity's fall from grace — Satan's rebellion, the war in Heaven, and the temptation in the Garden of Eden.",
    chapters: [
      {
        id: 1,
        title: "Book I: The Fall of Satan",
        paragraphs: [
          "Of Man's first disobedience, and the fruit of that forbidden tree whose mortal taste brought death into the World, and all our woe, with loss of Eden, till one greater Man restore us, and regain the blissful seat, sing, Heavenly Muse.",
          "What in me is dark illumine, what is low raise and support; that, to the height of this great argument, I may assert Eternal Providence, and justify the ways of God to men.",
          "Him the Almighty Power hurled headlong flaming from the ethereal sky, with hideous ruin and combustion, down to bottomless perdition, there to dwell in adamantine chains and penal fire, who durst defy the Omnipotent to arms.",
        ],
      },
      {
        id: 2,
        title: "Book II: The Council in Hell",
        paragraphs: [
          "High on a throne of royal state, which far outshone the wealth of Ormus and of Ind, or where the gorgeous East with richest hand showers on her kings barbaric pearl and gold, Satan exalted sat, by merit raised to that bad eminence.",
          "He now prepared to speak; whereat their doubled ranks they bend from wing to wing, and half enclose him round with all his peers: attention held them mute.",
          "Powers and Dominions, Deities of Heaven! — For, since no deep within her gulf can hold Immortal vigour, though oppressed and fallen, I give not Heaven for lost: from this descent celestial Virtues rising will appear more glorious.",
        ],
      },
      {
        id: 3,
        title: "Book III: The Heavenly Council",
        paragraphs: [
          "Hail, holy Light, offspring of Heaven firstborn! Or of the Eternal coeternal beam, may I express thee unblamed? Since God is light, and never but in unapproached light dwelt from eternity — dwelt then in thee, bright effluence of bright essence increate!",
          "Thus while God spake, ambrosial fragrance filled all Heaven, and in the blessed Spirits elect sense of new joy ineffable diffused. Beyond compare the Son of God was seen most glorious.",
          "Now had the Almighty Father from above, from the pure empyrean where he sits high throned above all height, bent down his eye, his own works and their works at once to view.",
        ],
      },
    ],
  },
];

export function getBook(id: string): Book | undefined {
  return books.find((b) => b.id === id);
}
