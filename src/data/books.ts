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
  cover_image?: string;  // public URL e.g. "/covers/iliad.png"
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
        title: "Book I",
        paragraphs: [
          "Sing, O goddess, the anger of Achilles son of Peleus, that brought countless ills upon the Achaeans. Many a brave soul did it send hurrying down to Hades, and many a hero did it yield a prey to dogs and vultures, for so were the counsels of Jove fulfilled from the day on which the son of Atreus, king of men, and great Achilles, first fell out with one another.",
          "And which of the gods was it that set them on to quarrel? It was the son of Jove and Leto; for he was angry with the king and sent a pestilence upon the host to plague the people, because the son of Atreus had dishonoured Chryses his priest. Now Chryses had come to the ships of the Achaeans to free his daughter, and had brought with him a great ransom: moreover he bore in his hand the sceptre of Apollo wreathed with a suppliant's wreath and he besought the Achaeans, but most of all the two sons of Atreus, who were their chiefs.",
          "\"Sons of Atreus,\" he cried, \"and all other Achaeans, may the gods who dwell in Olympus grant you to sack the city of Priam, and to reach your homes in safety; but free my daughter, and accept a ransom for her, in reverence to Apollo, son of Jove.\"",
        ],
      },
      {
        id: 2,
        title: "Book II",
        paragraphs: [
          "Now the other gods and the armed warriors on the plain slept soundly, but Jove was wakeful, for he was thinking how to do honour to Achilles, and destroyed much people at the ships of the Achaeans. In the end he deemed it would be best to send a lying dream to King Agamemnon; so he called one to him and said to it, \"Lying Dream, go to the ships of the Achaeans, into the tent of Agamemnon, and say to him word to word as I now bid you. Tell him to get the Achaeans instantly under arms, for he shall take Troy. There are no longer divided counsels among the gods; Juno has brought them to her own mind, and woe betides the Trojans.\"",
          "The dream went when it had heard its message, and soon reached the ships of the Achaeans. It sought Agamemnon son of Atreus and found him in his tent, wrapped in a profound slumber. It hovered over his head in the likeness of Nestor, son of Neleus, whom Agamemnon honoured above all his councillors, and said:-",
          "\"You are sleeping, son of Atreus; one who has the welfare of his host and so much other care upon his shoulders should dock his sleep. Hear me at once, for I come as a messenger from Jove, who, though he be not near, yet takes thought for you and pities you. He bids you get the Achaeans instantly under arms, for you shall take Troy. There are no longer divided counsels among the gods; Juno has brought them over to her own mind, and woe betides the Trojans at the hands of Jove. Remember this, and when you wake see that it does not escape you.\"",
        ],
      },
      {
        id: 3,
        title: "Book III",
        paragraphs: [
          "When the companies were thus arrayed, each under its own captain, the Trojans advanced as a flight of wild fowl or cranes that scream overhead when rain and winter drive them over the flowing waters of Oceanus to bring death and destruction on the Pygmies, and they wrangle in the air as they fly; but the Achaeans marched silently, in high heart, and minded to stand by one another.",
          "As when the south wind spreads a curtain of mist upon the mountain tops, bad for shepherds but better than night for thieves, and a man can see no further than he can throw a stone, even so rose the dust from under their feet as they made all speed over the plain.",
          "When they were close up with one another, Alexandrus came forward as champion on the Trojan side. On his shoulders he bore the skin of a panther, his bow, and his sword, and he brandished two spears shod with bronze as a challenge to the bravest of the Achaeans to meet him in single fight. Menelaus saw him thus stride out before the ranks, and was glad as a hungry lion that lights on the carcase of some goat or horned stag, and devours it there and then, though dogs and youths set upon him. Even thus was Menelaus glad when his eyes caught sight of Alexandrus, for he deemed that now he should be revenged. He sprang, therefore, from his chariot, clad in his suit of armour.",
        ],
      },
      {
        id: 4,
        title: "Book IV",
        paragraphs: [
          "Now the gods were sitting with Jove in council upon the golden floor while Hebe went round pouring out nectar for them to drink, and as they pledged one another in their cups of gold they looked down upon the town of Troy. The son of Saturn then began to tease Juno, talking at her so as to provoke her. \"Menelaus,\" said he, \"has two good friends among the goddesses, Juno of Argos, and Minerva of Alalcomene, but they only sit still and look on, while Venus keeps ever by Alexandrus' side to defend him in any danger; indeed she has just rescued him when he made sure that it was all over with him- for the victory really did lie with Menelaus. We must consider what we shall do about all this; shall we set them fighting anew or make peace between them? If you will agree to this last Menelaus can take back Helen and the city of Priam may remain still inhabited.\"",
          "Minerva and Juno muttered their discontent as they sat side by side hatching mischief for the Trojans. Minerva scowled at her father, for she was in a furious passion with him, and said nothing, but Juno could not contain herself. \"Dread son of Saturn,\" said she, \"what, pray, is the meaning of all this? Is my trouble, then, to go for nothing, and the sweat that I have sweated, to say nothing of my horses, while getting the people together against Priam and his children? Do as you will, but we other gods shall not all of us approve your counsel.\"",
          "Jove was angry and answered, \"My dear, what harm have Priam and his sons done you that you are so hotly bent on sacking the city of Ilius? Will nothing do for you but you must within their walls and eat Priam raw, with his sons and all the other Trojans to boot? Have it your own way then; for I would not have this matter become a bone of contention between us. I say further, and lay my saying to your heart, if ever I want to sack a city belonging to friends of yours, you must not try to stop me; you will have to let me do it, for I am giving in to you sorely against my will. Of all inhabited cities under the sun and stars of heaven, there was none that I so much respected as Ilius with Priam and his whole people. Equitable feasts were never wanting about my altar, nor the savour of burning fat, which is honour due to ourselves.\"",
        ],
      },
      {
        id: 5,
        title: "Book V",
        paragraphs: [
          "Then Pallas Minerva put valour into the heart of Diomed, son of Tydeus, that he might excel all the other Argives, and cover himself with glory. She made a stream of fire flare from his shield and helmet like the star that shines most brilliantly in summer after its bath in the waters of Oceanus- even such a fire did she kindle upon his head and shoulders as she bade him speed into the thickest hurly-burly of the fight.",
          "Now there was a certain rich and honourable man among the Trojans, priest of Vulcan, and his name was Dares. He had two sons, Phegeus and Idaeus, both of them skilled in all the arts of war. These two came forward from the main body of Trojans, and set upon Diomed, he being on foot, while they fought from their chariot. When they were close up to one another, Phegeus took aim first, but his spear went over Diomed's left shoulder without hitting him. Diomed then threw, and his spear sped not in vain, for it hit Phegeus on the breast near the nipple, and he fell from his chariot. Idaeus did not dare to bestride his brother's body, but sprang from the chariot and took to flight, or he would have shared his brother's fate; whereon Vulcan saved him by wrapping him in a cloud of darkness, that his old father might not be utterly overwhelmed with grief; but the son of Tydeus drove off with the horses, and bade his followers take them to the ships. The Trojans were scared when they saw the two sons of Dares, one of them in fright and the other lying dead by his chariot. Minerva, therefore, took Mars by the hand and said, \"Mars, Mars, bane of men, bloodstained stormer of cities, may we not now leave the Trojans and Achaeans to fight it out, and see to which of the two Jove will vouchsafe the victory? Let us go away, and thus avoid his anger.\"",
          "So saying, she drew Mars out of the battle, and set him down upon the steep banks of the Scamander. Upon this the Danaans drove the Trojans back, and each one of their chieftains killed his man. First King Agamemnon flung mighty Odius, captain of the Halizoni, from his chariot. The spear of Agamemnon caught him on the broad of his back, just as he was turning in flight; it struck him between the shoulders and went right through his chest, and his armour rang rattling round him as he fell heavily to the ground.",
        ],
      },
      {
        id: 6,
        title: "Book VI",
        paragraphs: [
          "The fight between Trojans and Achaeans was now left to rage as it would, and the tide of war surged hither and thither over the plain as they aimed their bronze-shod spears at one another between the streams of Simois and Xanthus.",
          "First, Ajax son of Telamon, tower of strength to the Achaeans, broke a phalanx of the Trojans, and came to the assistance of his comrades by killing Acamas son of Eussorus, the best man among the Thracians, being both brave and of great stature. The spear struck the projecting peak of his helmet: its bronze point then went through his forehead into the brain, and darkness veiled his eyes.",
          "Then Diomed killed Axylus son of Teuthranus, a rich man who lived in the strong city of Arisbe, and was beloved by all men; for he had a house by the roadside, and entertained every one who passed; howbeit not one of his guests stood before him to save his life, and Diomed killed both him and his squire Calesius, who was then his charioteer- so the pair passed beneath the earth.",
        ],
      },
      {
        id: 7,
        title: "Book VII",
        paragraphs: [
          "With these words Hector passed through the gates, and his brother Alexandrus with him, both eager for the fray. As when heaven sends a breeze to sailors who have long looked for one in vain, and have laboured at their oars till they are faint with toil, even so welcome was the sight of these two heroes to the Trojans.",
          "Thereon Alexandrus killed Menesthius the son of Areithous; he lived in Ame, and was son of Areithous the Mace-man, and of Phylomedusa. Hector threw a spear at Eioneus and struck him dead with a wound in the neck under the bronze rim of his helmet. Glaucus, moreover, son of Hippolochus, captain of the Lycians, in hard hand-to-hand fight smote Iphinous son of Dexius on the shoulder, as he was springing on to his chariot behind his fleet mares; so he fell to earth from the car, and there was no life left in him.",
          "When, therefore, Minerva saw these men making havoc of the Argives, she darted down to Ilius from the summits of Olympus, and Apollo, who was looking on from Pergamus, went out to meet her; for he wanted the Trojans to be victorious. The pair met by the oak tree, and King Apollo son of Jove was first to speak. \"What would you have said he, \"daughter of great Jove, that your proud spirit has sent you hither from Olympus? Have you no pity upon the Trojans, and would you incline the scales of victory in favour of the Danaans? Let me persuade you- for it will be better thus- stay the combat for to-day, but let them renew the fight hereafter till they compass the doom of Ilius, since you goddesses have made up your minds to destroy the city.\"",
        ],
      },
      {
        id: 8,
        title: "Book VIII",
        paragraphs: [
          "Now when Morning, clad in her robe of saffron, had begun to suffuse light over the earth, Jove called the gods in council on the topmost crest of serrated Olympus. Then he spoke and all the other gods gave ear. \"Hear me,\" said he, \"gods and goddesses, that I may speak even as I am minded. Let none of you neither goddess nor god try to cross me, but obey me every one of you that I may bring this matter to an end. If I see anyone acting apart and helping either Trojans or Danaans, he shall be beaten inordinately ere he come back again to Olympus; or I will hurl him down into dark Tartarus far into the deepest pit under the earth, where the gates are iron and the floor bronze, as far beneath Hades as heaven is high above the earth, that you may learn how much the mightiest I am among you. Try me and find out for yourselves. Hangs me a golden chain from heaven, and lay hold of it all of you, gods and goddesses together- tug as you will, you will not drag Jove the supreme counsellor from heaven to earth; but were I to pull at it myself I should draw you up with earth and sea into the bargain, then would I bind the chain about some pinnacle of Olympus and leave you all dangling in the mid firmament. So far am I above all others either of gods or men.\"",
          "They were frightened and all of them of held their peace, for he had spoken masterfully; but at last Minerva answered, \"Father, son of Saturn, king of kings, we all know that your might is not to be gainsaid, but we are also sorry for the Danaan warriors, who are perishing and coming to a bad end. We will, however, since you so bid us, refrain from actual fighting, but we will make serviceable suggestions to the Argives that they may not all of them perish in your displeasure.\"",
          "Jove smiled at her and answered, \"Take heart, my child, Trito-born; I am not really in earnest, and I wish to be kind to you.\"",
        ],
      },
      {
        id: 9,
        title: "Book IX",
        paragraphs: [
          "Thus did the Trojans watch. But Panic, comrade of blood-stained Rout, had taken fast hold of the Achaeans and their princes were all of them in despair. As when the two winds that blow from Thrace- the north and the northwest- spring up of a sudden and rouse the fury of the main- in a moment the dark waves uprear their heads and scatter their sea-wrack in all directions- even thus troubled were the hearts of the Achaeans.",
          "The son of Atreus in dismay bade the heralds call the people to a council man by man, but not to cry the matter aloud; he made haste also himself to call them, and they sat sorry at heart in their assembly. Agamemnon shed tears as it were a running stream or cataract on the side of some sheer cliff; and thus, with many a heavy sigh he spoke to the Achaeans. \"My friends,\" said he, \"princes and councillors of the Argives, the hand of heaven has been laid heavily upon me. Cruel Jove gave me his solemn promise that I should sack the city of Troy before returning, but he has played me false, and is now bidding me go ingloriously back to Argos with the loss of much people. Such is the will of Jove, who has laid many a proud city in the dust as he will yet lay others, for his power is above all. Now, therefore, let us all do as I say and sail back to our own country, for we shall not take Troy.\"",
          "Thus he spoke, and the sons of the Achaeans for a long while sat sorrowful there, but they all held their peace, till at last Diomed of the loud battle-cry made answer saying, \"Son of Atreus, I will chide your folly, as is my right in council. Be not then aggrieved that I should do so. In the first place you attacked me before all the Danaans and said that I was a coward and no soldier. The Argives young and old know that you did so. But the son of scheming Saturn endowed you by halves only. He gave you honour as the chief ruler over us, but valour, which is the highest both right and might he did not give you. Sir, think you that the sons of the Achaeans are indeed as unwarlike and cowardly as you say they are? If your own mind is set upon going home- go- the way is open to you; the many ships that followed you from Mycene stand ranged upon the seashore; but the rest of us stay here till we have sacked Troy. Nay though these too should turn homeward with their ships, Sthenelus and myself will still fight on till we reach the goal of Ilius, for for heaven was with us when we came.\"",
        ],
      },
      {
        id: 10,
        title: "Book X",
        paragraphs: [
          "Now the other princes of the Achaeans slept soundly the whole night through, but Agamemnon son of Atreus was troubled, so that he could get no rest. As when fair Juno's lord flashes his lightning in token of great rain or hail or snow when the snow-flakes whiten the ground, or again as a sign that he will open the wide jaws of hungry war, even so did Agamemnon heave many a heavy sigh, for his soul trembled within him. When he looked upon the plain of Troy he marvelled at the many watchfires burning in front of Ilius, and at the sound of pipes and flutes and of the hum of men, but when presently he turned towards the ships and hosts of the Achaeans, he tore his hair by handfuls before Jove on high, and groaned aloud for the very disquietness of his soul. In the end he deemed it best to go at once to Nestor son of Neleus, and see if between them they could find any way of the Achaeans from destruction. He therefore rose, put on his shirt, bound his sandals about his comely feet, flung the skin of a huge tawny lion over his shoulders- a skin that reached his feet- and took his spear in his hand.",
          "Neither could Menelaus sleep, for he, too, boded ill for the Argives who for his sake had sailed from far over the seas to fight the Trojans. He covered his broad back with the skin of a spotted panther, put a casque of bronze upon his head, and took his spear in his brawny hand. Then he went to rouse his brother, who was by far the most powerful of the Achaeans, and was honoured by the people as though he were a god. He found him by the stern of his ship already putting his goodly array about his shoulders, and right glad was he that his brother had come.",
          "Menelaus spoke first. \"Why,\" said he, \"my dear brother, are you thus arming? Are you going to send any of our comrades to exploit the Trojans? I greatly fear that no one will do you this service, and spy upon the enemy alone in the dead of night. It will be a deed of great daring.\"",
        ],
      },
      {
        id: 11,
        title: "Book XI",
        paragraphs: [
          "And now as Dawn rose from her couch beside Tithonus, harbinger of light alike to mortals and immortals, Jove sent fierce Discord with the ensign of war in her hands to the ships of the Achaeans. She took her stand by the huge black hull of Ulysses' ship which was middlemost of all, so that her voice might carry farthest on either side, on the one hand towards the tents of Ajax son of Telamon, and on the other towards those of Achilles- for these two heroes, well-assured of their own strength, had valorously drawn up their ships at the two ends of the line. There she took her stand, and raised a cry both loud and shrill that filled the Achaeans with courage, giving them heart to fight resolutely and with all their might, so that they had rather stay there and do battle than go home in their ships.",
          "The son of Atreus shouted aloud and bade the Argives gird themselves for battle while he put on his armour. First he girded his goodly greaves about his legs, making them fast with ankle clasps of silver; and about his chest he set the breastplate which Cinyras had once given him as a guest-gift. It had been noised abroad as far as Cyprus that the Achaeans were about to sail for Troy, and therefore he gave it to the king. It had ten courses of dark cyanus, twelve of gold, and ten of tin. There were serpents of cyanus that reared themselves up towards the neck, three upon either side, like the rainbows which the son of Saturn has set in heaven as a sign to mortal men. About his shoulders he threw his sword, studded with bosses of gold; and the scabbard was of silver with a chain of gold wherewith to hang it. He took moreover the richly-dight shield that covered his body when he was in battle- fair to see, with ten circles of bronze running all round see, wit it. On the body of the shield there were twenty bosses of white tin, with another of dark cyanus in the middle: this last was made to show a Gorgon's head, fierce and grim, with Rout and Panic on either side. The band for the arm to go through was of silver, on which there was a writhing snake of cyanus with three heads that sprang from a single neck, and went in and out among one another. On his head Agamemnon set a helmet, with a peak before and behind, and four plumes of horse-hair that nodded menacingly above it; then he grasped two redoubtable bronze-shod spears, and the gleam of his armour shot from him as a flame into the firmament, while Juno and Minerva thundered in honour of the king of rich Mycene.",
          "Every man now left his horses in charge of his charioteer to hold them in readiness by the trench, while he went into battle on foot clad in full armour, and a mighty uproar rose on high into the dawning. The chiefs were armed and at the trench before the horses got there, but these came up presently. The son of Saturn sent a portent of evil sound about their host, and the dew fell red with blood, for he was about to send many a brave man hurrying down to Hades.",
        ],
      },
      {
        id: 12,
        title: "Book XII",
        paragraphs: [
          "So the son of Menoetius was attending to the hurt of Eurypylus within the tent, but the Argives and Trojans still fought desperately, nor were the trench and the high wall above it, to keep the Trojans in check longer. They had built it to protect their ships, and had dug the trench all round it that it might safeguard both the ships and the rich spoils which they had taken, but they had not offered hecatombs to the gods. It had been built without the consent of the immortals, and therefore it did not last. So long as Hector lived and Achilles nursed his anger, and so long as the city of Priam remained untaken, the great wall of the Achaeans stood firm; but when the bravest of the Trojans were no more, and many also of the Argives, though some were yet left alive when, moreover, the city was sacked in the tenth year, and the Argives had gone back with their ships to their own country- then Neptune and Apollo took counsel to destroy the wall, and they turned on to it the streams of all the rivers from Mount Ida into the sea, Rhesus, Heptaporus, Caresus, Rhodius, Grenicus, Aesopus, and goodly Scamander, with Simois, where many a shield and helm had fallen, and many a hero of the race of demigods had bitten the dust. Phoebus Apollo turned the mouths of all these rivers together and made them flow for nine days against the wall, while Jove rained the whole time that he might wash it sooner into the sea. Neptune himself, trident in hand, surveyed the work and threw into the sea all the foundations of beams and stones which the Achaeans had laid with so much toil; he made all level by the mighty stream of the Hellespont, and then when he had swept the wall away he spread a great beach of sand over the place where it had been. This done he turned the rivers back into their old courses.",
          "This was what Neptune and Apollo were to do in after time; but as yet battle and turmoil were still raging round the wall till its timbers rang under the blows that rained upon them. The Argives, cowed by the scourge of Jove, were hemmed in at their ships in fear of Hector the mighty minister of Rout, who as heretofore fought with the force and fury of a whirlwind. As a lion or wild boar turns fiercely on the dogs and men that attack him, while these form solid wall and shower their javelins as they face him- his courage is all undaunted, but his high spirit will be the death of him; many a time does he charge at his pursuers to scatter them, and they fall back as often as he does so- even so did Hector go about among the host exhorting his men, and cheering them on to cross the trench.",
          "But the horses dared not do so, and stood neighing upon its brink, for the width frightened them. They could neither jump it nor cross it, for it had overhanging banks all round upon either side, above which there were the sharp stakes that the sons of the Achaeans had planted so close and strong as a defence against all who would assail it; a horse, therefore, could not get into it and draw his chariot after him, but those who were on foot kept trying their very utmost. Then Polydamas went up to Hector and said, \"Hector, and you other captains of the Trojans and allies, it is madness for us to try and drive our horses across the trench; it will be very hard to cross, for it is full of sharp stakes, and beyond these there is the wall. Our horses therefore cannot get down into it, and would be of no use if they did; moreover it is a narrow place and we should come to harm. If, indeed, great Jove is minded to help the Trojans, and in his anger will utterly destroy the Achaeans, I would myself gladly see them perish now and here far from Argos; but if they should rally and we are driven back from the ships pell-mell into the trench there will be not so much as a man get back to the city to tell the tale. Now, therefore, let us all do as I say; let our squires hold our horses by the trench, but let us follow Hector in a body on foot, clad in full armour, and if the day of their doom is at hand the Achaeans will not be able to withstand us.\"",
        ],
      },
      {
        id: 13,
        title: "Book XIII",
        paragraphs: [
          "Now when Jove had thus brought Hector and the Trojans to the ships, he left them to their never-ending toil, and turned his keen eyes away, looking elsewhither towards the horse-breeders of Thrace, the Mysians, fighters at close quarters, the noble Hippemolgi, who live on milk, and the Abians, justest of mankind. He no longer turned so much as a glance towards Troy, for he did not think that any of the immortals would go and help either Trojans or Danaans.",
          "But King Neptune had kept no blind look-out; he had been looking admiringly on the battle from his seat on the topmost crests of wooded Samothrace, whence he could see all Ida, with the city of Priam and the ships of the Achaeans. He had come from under the sea and taken his place here, for he pitied the Achaeans who were being overcome by the Trojans; and he was furiously angry with Jove.",
          "Presently he came down from his post on the mountain top, and as he strode swiftly onwards the high hills and the forest quaked beneath the tread of his immortal feet. Three strides he took, and with the fourth he reached his goal- Aegae, where is his glittering golden palace, imperishable, in the depths of the sea. When he got there, he yoked his fleet brazen-footed steeds with their manes of gold all flying in the wind; he clothed himself in raiment of gold, grasped his gold whip, and took his stand upon his chariot. As he went his way over the waves the sea-monsters left their lairs, for they knew their lord, and came gambolling round him from every quarter of the deep, while the sea in her gladness opened a path before his chariot. So lightly did the horses fly that the bronze axle of the car was not even wet beneath it; and thus his bounding steeds took him to the ships of the Achaeans.",
        ],
      },
      {
        id: 14,
        title: "Book XIV",
        paragraphs: [
          "Nestor was sitting over his wine, but the cry of battle did not escape him, and he said to the son of Aesculapius, \"What, noble Machaon, is the meaning of all this? The shouts of men fighting by our ships grow stronger and stronger; stay here, therefore, and sit over your wine, while fair Hecamede heats you a bath and washes the clotted blood from off you. I will go at once to the look-out station and see what it is all about.\"",
          "As he spoke he took up the shield of his son Thrasymedes that was lying in his tent, all gleaming with bronze, for Thrasymedes had taken his father's shield; he grasped his redoubtable bronze-shod spear, and as soon as he was outside saw the disastrous rout of the Achaeans who, now that their wall was overthrown, were flying pell-mell before the Trojans. As when there is a heavy swell upon the sea, but the waves are dumb- they keep their eyes on the watch for the quarter whence the fierce winds may spring upon them, but they stay where they are and set neither this way nor that, till some particular wind sweeps down from heaven to determine them- even so did the old man ponder whether to make for the crowd of Danaans, or go in search of Agamemnon. In the end he deemed it best to go to the son of Atreus; but meanwhile the hosts were fighting and killing one another, and the hard bronze rattled on their bodies, as they thrust at one another with their swords and spears.",
          "The wounded kings, the son of Tydeus, Ulysses, and Agamemnon son of Atreus, fell in Nestor as they were coming up from their ships- for theirs were drawn up some way from where the fighting was going on, being on the shore itself inasmuch as they had been beached first, while the wall had been built behind the hindermost. The stretch of the shore, wide though it was, did not afford room for all the ships, and the host was cramped for space, therefore they had placed the ships in rows one behind the other, and had filled the whole opening of the bay between the two points that formed it. The kings, leaning on their spears, were coming out to survey the fight, being in great anxiety, and when old Nestor met them they were filled with dismay. Then King Agamemnon said to him, \"Nestor son of Neleus, honour to the Achaean name, why have you left the battle to come hither? I fear that what dread Hector said will come true, when he vaunted among the Trojans saying that he would not return to Ilius till he had fired our ships and killed us; this is what he said, and now it is all coming true. Alas! others of the Achaeans, like Achilles, are in anger with me that they refuse to fight by the sterns of our ships.\"",
        ],
      },
      {
        id: 15,
        title: "Book XV",
        paragraphs: [
          "But when their flight had taken them past the trench and the set stakes, and many had fallen by the hands of the Danaans, the Trojans made a halt on reaching their chariots, routed and pale with fear. Jove now woke on the crests of Ida, where he was lying with golden-throned Juno by his side, and starting to his feet he saw the Trojans and Achaeans, the one thrown into confusion, and the others driving them pell-mell before them with King Neptune in their midst. He saw Hector lying on the ground with his comrades gathered round him, gasping for breath, wandering in mind and vomiting blood, for it was not the feeblest of the Achaeans who struck him.",
          "The sire of gods and men had pity on him, and looked fiercely on Juno. \"I see, Juno,\" said he, \"you mischief- making trickster, that your cunning has stayed Hector from fighting and has caused the rout of his host. I am in half a mind to thrash you, in which case you will be the first to reap the fruits of your scurvy knavery. Do you not remember how once upon a time I had you hanged? I fastened two anvils on to your feet, and bound your hands in a chain of gold which none might break, and you hung in mid-air among the clouds. All the gods in Olympus were in a fury, but they could not reach you to set you free; when I caught any one of them I gripped him and hurled him from the heavenly threshold till he came fainting down to earth; yet even this did not relieve my mind from the incessant anxiety which I felt about noble Hercules whom you and Boreas had spitefully conveyed beyond the seas to Cos, after suborning the tempests; but I rescued him, and notwithstanding all his mighty labours I brought him back again to Argos. I would remind you of this that you may learn to leave off being so deceitful, and discover how much you are likely to gain by the embraces out of which you have come here to trick me.\"",
          "Juno trembled as he spoke, and said, \"May heaven above and earth below be my witnesses, with the waters of the river Styx- and this is the most solemn oath that a blessed god can take- nay, I swear also by your own almighty head and by our bridal bed- things over which I could never possibly perjure myself- that Neptune is not punishing Hector and the Trojans and helping the Achaeans through any doing of mine; it is all of his own mere motion because he was sorry to see the Achaeans hard pressed at their ships: if I were advising him, I should tell him to do as you bid him.\"",
        ],
      },
      {
        id: 16,
        title: "Book XVI",
        paragraphs: [
          "Thus did they fight about the ship of Protesilaus. Then Patroclus drew near to Achilles with tears welling from his eyes, as from some spring whose crystal stream falls over the ledges of a high precipice. When Achilles saw him thus weeping he was sorry for him and said, \"Why, Patroclus, do you stand there weeping like some silly child that comes running to her mother, and begs to be taken up and carried- she catches hold of her mother's dress to stay her though she is in a hurry, and looks tearfully up until her mother carries her- even such tears, Patroclus, are you now shedding. Have you anything to say to the Myrmidons or to myself? or have you had news from Phthia which you alone know? They tell me Menoetius son of Actor is still alive, as also Peleus son of Aeacus, among the Myrmidons- men whose loss we two should bitterly deplore; or are you grieving about the Argives and the way in which they are being killed at the ships, throu their own high-handed doings? Do not hide anything from me but tell me that both of us may know about it.\"",
          "Then, O knight Patroclus, with a deep sigh you answered, \"Achilles, son of Peleus, foremost champion of the Achaeans, do not be angry, but I weep for the disaster that has now befallen the Argives. All those who have been their champions so far are lying at the ships, wounded by sword or spear. Brave Diomed son of Tydeus has been hit with a spear, while famed Ulysses and Agamemnon have received sword-wounds; Eurypylus again has been struck with an arrow in the thigh; skilled apothecaries are attending to these heroes, and healing them of their wounds; are you still, O Achilles, so inexorable? May it never be my lot to nurse such a passion as you have done, to the baning of your own good name. Who in future story will speak well of you unless you now save the Argives from ruin? You know no pity; knight Peleus was not your father nor Thetis your mother, but the grey sea bore you and the sheer cliffs begot you, so cruel and remorseless are you. If however you are kept back through knowledge of some oracle, or if your mother Thetis has told you something from the mouth of Jove, at least send me and the Myrmidons with me, if I may bring deliverance to the Danaans. Let me moreover wear your armour; the Trojans may thus mistake me for you and quit the field, so that the hard-pressed sons of the Achaeans may have breathing time- which while they are fighting may hardly be. We who are fresh might soon drive tired men back from our ships and tents to their own city.\"",
          "He knew not what he was asking, nor that he was suing for his own destruction. Achilles was deeply moved and answered, \"What, noble Patroclus, are you saying? I know no prophesyings which I am heeding, nor has my mother told me anything from the mouth of Jove, but I am cut to the very heart that one of my own rank should dare to rob me because he is more powerful than I am. This, after all that I have gone through, is more than I can endure. The girl whom the sons of the Achaeans chose for me, whom I won as the fruit of my spear on having sacked a city- her has King Agamemnon taken from me as though I were some common vagrant. Still, let bygones be bygones: no man may keep his anger for ever; I said I would not relent till battle and the cry of war had reached my own ships; nevertheless, now gird my armour about your shoulders, and lead the Myrmidons to battle, for the dark cloud of Trojans has burst furiously over our fleet; the Argives are driven back on to the beach, cooped within a narrow space, and the whole people of Troy has taken heart to sally out against them, because they see not the visor of my helmet gleaming near them. Had they seen this, there would not have been a creek nor grip that had not been filled with their dead as they fled back again. And so it would have been, if only King Agamemnon had dealt fairly by me. As it is the Trojans have beset our host. Diomed son of Tydeus no longer wields his spear to defend the Danaans, neither have I heard the voice of the son of Atreus coming from his hated head, whereas that of murderous Hector rings in my cars as he gives orders to the Trojans, who triumph over the Achaeans and fill the whole plain with their cry of battle. But even so, Patroclus, fall upon them and save the fleet, lest the Trojans fire it and prevent us from being able to return. Do, however, as I now bid you, that you may win me great honour from all the Danaans, and that they may restore the girl to me again and give me rich gifts into the bargain. When you have driven the Trojans from the ships, come back again. Though Juno's thundering husband should put triumph within your reach, do not fight the Trojans further in my absence, or you will rob me of glory that should be mine. And do not for lust of battle go on killing the Trojans nor lead the Achaeans on to Ilius, lest one of the ever-living gods from Olympus attack you- for Phoebus Apollo loves them well: return when you have freed the ships from peril, and let others wage war upon the plain. Would, by father Jove, Minerva, and Apollo, that not a single man of all the Trojans might be left alive, nor yet of the Argives, but that we two might be alone left to tear aside the mantle that veils the brow of Troy.\"",
        ],
      },
      {
        id: 17,
        title: "Book XVII",
        paragraphs: [
          "Brave Menelaus son of Atreus now came to know that Patroclus had fallen, and made his way through the front ranks clad in full armour to bestride him. As a cow stands lowing over her first calf, even so did yellow-haired Menelaus bestride Patroclus. He held his round shield and his spear in front of him, resolute to kill any who should dare face him. But the son of Panthous had also noted the body, and came up to Menelaus saying, \"Menelaus, son of Atreus, draw back, leave the body, and let the bloodstained spoils be. I was first of the Trojans and their brave allies to drive my spear into Patroclus, let me, therefore, have my full glory among the Trojans, or I will take aim and kill you.\"",
          "To this Menelaus answered in great anger \"By father Jove, boasting is an ill thing. The pard is not more bold, nor the lion nor savage wild-boar, which is fiercest and most dauntless of all creatures, than are the proud sons of Panthous. Yet Hyperenor did not see out the days of his youth when he made light of me and withstood me, deeming me the meanest soldier among the Danaans. His own feet never bore him back to gladden his wife and parents. Even so shall I make an end of you too, if you withstand me; get you back into the crowd and do not face me, or it shall be worse for you. Even a fool may be wise after the event.\"",
          "Euphorbus would not listen, and said, \"Now indeed, Menelaus, shall you pay for the death of my brother over whom you vaunted, and whose wife you widowed in her bridal chamber, while you brought grief unspeakable on his parents. I shall comfort these poor people if I bring your head and armour and place them in the hands of Panthous and noble Phrontis. The time is come when this matter shall be fought out and settled, for me or against me.\"",
        ],
      },
      {
        id: 18,
        title: "Book XVIII",
        paragraphs: [
          "Thus then did they fight as it were a flaming fire. Meanwhile the fleet runner Antilochus, who had been sent as messenger, reached Achilles, and found him sitting by his tall ships and boding that which was indeed too surely true. \"Alas,\" said he to himself in the heaviness of his heart, \"why are the Achaeans again scouring the plain and flocking towards the ships? Heaven grant the gods be not now bringing that sorrow upon me of which my mother Thetis spoke, saying that while I was yet alive the bravest of the Myrmidons should fall before the Trojans, and see the light of the sun no longer. I fear the brave son of Menoetius has fallen through his own daring and yet I bade him return to the ships as soon as he had driven back those that were bringing fire against them, and not join battle with Hector.\"",
          "As he was thus pondering, the son of Nestor came up to him and told his sad tale, weeping bitterly the while. \"Alas,\" he cried, \"son of noble Peleus, I bring you bad tidings, would indeed that they were untrue. Patroclus has fallen, and a fight is raging about his naked body- for Hector holds his armour.\"",
          "A dark cloud of grief fell upon Achilles as he listened. He filled both hands with dust from off the ground, and poured it over his head, disfiguring his comely face, and letting the refuse settle over his shirt so fair and new. He flung himself down all huge and hugely at full length, and tore his hair with his hands. The bondswomen whom Achilles and Patroclus had taken captive screamed aloud for grief, beating their breasts, and with their limbs failing them for sorrow. Antilochus bent over him the while, weeping and holding both his hands as he lay groaning for he feared that he might plunge a knife into his own throat. Then Achilles gave a loud cry and his mother heard him as she was sitting in the depths of the sea by the old man her father, whereon she screamed, and all the goddesses daughters of Nereus that dwelt at the bottom of the sea, came gathering round her. There were Glauce, Thalia and Cymodoce, Nesaia, Speo, thoe and dark-eyed Halie, Cymothoe, Actaea and Limnorea, Melite, Iaera, Amphithoe and Agave, Doto and Proto, Pherusa and Dynamene, Dexamene, Amphinome and Callianeira, Doris, Panope, and the famous sea-nymph Galatea, Nemertes, Apseudes and Callianassa. There were also Clymene, Ianeira and Ianassa, Maera, Oreithuia and Amatheia of the lovely locks, with other Nereids who dwell in the depths of the sea. The crystal cave was filled with their multitude and they all beat their breasts while Thetis led them in their lament.",
        ],
      },
      {
        id: 19,
        title: "Book XIX",
        paragraphs: [
          "Now when Dawn in robe of saffron was hasting from the streams of Oceanus, to bring light to mortals and immortals, Thetis reached the ships with the armour that the god had given her. She found her son fallen about the body of Patroclus and weeping bitterly. Many also of his followers were weeping round him, but when the goddess came among them she clasped his hand in her own, saying, \"My son, grieve as we may we must let this man lie, for it is by heaven's will that he has fallen; now, therefore, accept from Vulcan this rich and goodly armour, which no man has ever yet borne upon his shoulders.\"",
          "As she spoke she set the armour before Achilles, and it rang out bravely as she did so. The Myrmidons were struck with awe, and none dared look full at it, for they were afraid; but Achilles was roused to still greater fury, and his eyes gleamed with a fierce light, for he was glad when he handled the splendid present which the god had made him. Then, as soon as he had satisfied himself with looking at it, he said to his mother, \"Mother, the god has given me armour, meet handiwork for an immortal and such as no living could have fashioned; I will now arm, but I much fear that flies will settle upon the son of Menoetius and breed worms about his wounds, so that his body, now he is dead, will be disfigured and the flesh will rot.\"",
          "Silver-footed Thetis answered, \"My son, be not disquieted about this matter. I will find means to protect him from the swarms of noisome flies that prey on the bodies of men who have been killed in battle. He may lie for a whole year, and his flesh shall still be as sound as ever, or even sounder. Call, therefore, the Achaean heroes in assembly; unsay your anger against Agamemnon; arm at once, and fight with might and main.\"",
        ],
      },
      {
        id: 20,
        title: "Book XX",
        paragraphs: [
          "Thus, then, did the Achaeans arm by their ships round you, O son of Peleus, who were hungering for battle; while the Trojans over against them armed upon the rise of the plain.",
          "Meanwhile Jove from the top of many-delled Olympus, bade Themis gather the gods in council, whereon she went about and called them to the house of Jove. There was not a river absent except Oceanus, nor a single one of the nymphs that haunt fair groves, or springs of rivers and meadows of green grass. When they reached the house of cloud-compelling Jove, they took their seats in the arcades of polished marble which Vulcan with his consummate skill had made for father Jove.",
          "In such wise, therefore, did they gather in the house of Jove. Neptune also, lord of the earthquake, obeyed the call of the goddess, and came up out of the sea to join them. There, sitting in the midst of them, he asked what Jove's purpose might be. \"Why,\" said he, \"wielder of the lightning, have you called the gods in council? Are you considering some matter that concerns the Trojans and Achaeans- for the blaze of battle is on the point of being kindled between them?\"",
        ],
      },
      {
        id: 21,
        title: "Book XXI",
        paragraphs: [
          "Now when they came to the ford of the full-flowing river Xanthus, begotten of immortal Jove, Achilles cut their forces in two: one half he chased over the plain towards the city by the same way that the Achaeans had taken when flying panic-stricken on the preceding day with Hector in full triumph; this way did they fly pell-mell, and Juno sent down a thick mist in front of them to stay them. The other half were hemmed in by the deep silver-eddying stream, and fell into it with a great uproar. The waters resounded, and the banks rang again, as they swam hither and thither with loud cries amid the whirling eddies. As locusts flying to a river before the blast of a grass fire- the flame comes on and on till at last it overtakes them and they huddle into the water- even so was the eddying stream of Xanthus filled with the uproar of men and horses, all struggling in confusion before Achilles.",
          "Forthwith the hero left his spear upon the bank, leaning it against a tamarisk bush, and plunged into the river like a god, armed with his sword only. Fell was his purpose as he hewed the Trojans down on every side. Their dying groans rose hideous as the sword smote them, and the river ran red with blood. As when fish fly scared before a huge dolphin, and fill every nook and corner of some fair haven- for he is sure to eat all he can catch- even so did the Trojans cower under the banks of the mighty river, and when Achilles' arms grew weary with killing them, he drew twelve youths alive out of the water, to sacrifice in revenge for Patroclus son of Menoetius. He drew them out like dazed fawns, bound their hands behind them with the girdles of their own shirts, and gave them over to his men to take back to the ships. Then he sprang into the river, thirsting for still further blood.",
          "There he found Lycaon, son of Priam seed of Dardanus, as he was escaping out of the water; he it was whom he had once taken prisoner when he was in his father's vineyard, having set upon him by night, as he was cutting young shoots from a wild fig-tree to make the wicker sides of a chariot. Achilles then caught him to his sorrow unawares, and sent him by sea to Lemnos, where the son of Jason bought him. But a guest-friend, Eetion of Imbros, freed him with a great sum, and sent him to Arisbe, whence he had escaped and returned to his father's house. He had spent eleven days happily with his friends after he had come from Lemnos, but on the twelfth heaven again delivered him into the hands of Achilles, who was to send him to the house of Hades sorely against his will. He was unarmed when Achilles caught sight of him, and had neither helmet nor shield; nor yet had he any spear, for he had thrown all his armour from him on to the bank, and was sweating with his struggles to get out of the river, so that his strength was now failing him.",
        ],
      },
      {
        id: 22,
        title: "Book XXII",
        paragraphs: [
          "Thus the Trojans in the city, scared like fawns, wiped the sweat from off them and drank to quench their thirst, leaning against the goodly battlements, while the Achaeans with their shields laid upon their shoulders drew close up to the walls. But stern fate bade Hector stay where he was before Ilius and the Scaean gates. Then Phoebus Apollo spoke to the son of Peleus saying, \"Why, son of Peleus, do you, who are but man, give chase to me who am immortal? Have you not yet found out that it is a god whom you pursue so furiously? You did not harass the Trojans whom you had routed, and now they are within their walls, while you have been decoyed hither away from them. Me you cannot kill, for death can take no hold upon me.\"",
          "Achilles was greatly angered and said, \"You have baulked me, Far-Darter, most malicious of all gods, and have drawn me away from the wall, where many another man would have bitten the dust ere he got within Ilius; you have robbed me of great glory and have saved the Trojans at no risk to yourself, for you have nothing to fear, but I would indeed have my revenge if it were in my power to do so.\"",
          "On this, with fell intent he made towards the city, and as the winning horse in a chariot race strains every nerve when he is flying over the plain, even so fast and furiously did the limbs of Achilles bear him onwards. King Priam was first to note him as he scoured the plain, all radiant as the star which men call Orion's Hound, and whose beams blaze forth in time of harvest more brilliantly than those of any other that shines by night; brightest of them all though he be, he yet bodes ill for mortals, for he brings fire and fever in his train- even so did Achilles' armour gleam on his breast as he sped onwards. Priam raised a cry and beat his head with his hands as he lifted them up and shouted out to his dear son, imploring him to return; but Hector still stayed before the gates, for his heart was set upon doing battle with Achilles. The old man reached out his arms towards him and bade him for pity's sake come within the walls. \"Hector,\" he cried, \"my son, stay not to face this man alone and unsupported, or you will meet death at the hands of the son of Peleus, for he is mightier than you. Monster that he is; would indeed that the gods loved him no better than I do, for so, dogs and vultures would soon devour him as he lay stretched on earth, and a load of grief would be lifted from my heart, for many a brave son has he reft from me, either by killing them or selling them away in the islands that are beyond the sea: even now I miss two sons from among the Trojans who have thronged within the city, Lycaon and Polydorus, whom Laothoe peeress among women bore me. Should they be still alive and in the hands of the Achaeans, we will ransom them with gold and bronze, of which we have store, for the old man Altes endowed his daughter richly; but if they are already dead and in the house of Hades, sorrow will it be to us two who were their parents; albeit the grief of others will be more short-lived unless you too perish at the hands of Achilles. Come, then, my son, within the city, to be the guardian of Trojan men and Trojan women, or you will both lose your own life and afford a mighty triumph to the son of Peleus. Have pity also on your unhappy father while life yet remains to him- on me, whom the son of Saturn will destroy by a terrible doom on the threshold of old age, after I have seen my sons slain and my daughters haled away as captives, my bridal chambers pillaged, little children dashed to earth amid the rage of battle, and my sons' wives dragged away by the cruel hands of the Achaeans; in the end fierce hounds will tear me in pieces at my own gates after some one has beaten the life out of my body with sword or spear-hounds that I myself reared and fed at my own table to guard my gates, but who will yet lap my blood and then lie all distraught at my doors. When a young man falls by the sword in battle, he may lie where he is and there is nothing unseemly; let what will be seen, all is honourable in death, but when an old man is slain there is nothing in this world more pitiable than that dogs should defile his grey hair and beard and all that men hide for shame.\"",
        ],
      },
      {
        id: 23,
        title: "Book XXIII",
        paragraphs: [
          "Thus did they make their moan throughout the city, while the Achaeans when they reached the Hellespont went back every man to his own ship. But Achilles would not let the Myrmidons go, and spoke to his brave comrades saying, \"Myrmidons, famed horsemen and my own trusted friends, not yet, forsooth, let us unyoke, but with horse and chariot draw near to the body and mourn Patroclus, in due honour to the dead. When we have had full comfort of lamentation we will unyoke our horses and take supper all of us here.\"",
          "On this they all joined in a cry of wailing and Achilles led them in their lament. Thrice did they drive their chariots all sorrowing round the body, and Thetis stirred within them a still deeper yearning. The sands of the seashore and the men's armour were wet with their weeping, so great a minister of fear was he whom they had lost. Chief in all their mourning was the son of Peleus: he laid his bloodstained hand on the breast of his friend. \"Fare well,\" he cried, \"Patroclus, even in the house of Hades. I will now do all that I erewhile promised you; I will drag Hector hither and let dogs devour him raw; twelve noble sons of Trojans will I also slay before your pyre to avenge you.\"",
          "As he spoke he treated the body of noble Hector with contumely, laying it at full length in the dust beside the bier of Patroclus. The others then put off every man his armour, took the horses from their chariots, and seated themselves in great multitude by the ship of the fleet descendant of Aeacus, who thereon feasted them with an abundant funeral banquet. Many a goodly ox, with many a sheep and bleating goat did they butcher and cut up; many a tusked boar moreover, fat and well-fed, did they singe and set to roast in the flames of Vulcan; and rivulets of blood flowed all round the place where the body was lying.",
        ],
      },
      {
        id: 24,
        title: "Book XXIV",
        paragraphs: [
          "The assembly now broke up and the people went their ways each to his own ship. There they made ready their supper, and then bethought them of the blessed boon of sleep; but Achilles still wept for thinking of his dear comrade, and sleep, before whom all things bow, could take no hold upon him. This way and that did he turn as he yearned after the might and manfulness of Patroclus; he thought of all they had done together, and all they had gone through both on the field of battle and on the waves of the weary sea. As he dwelt on these things he wept bitterly and lay now on his side, now on his back, and now face downwards, till at last he rose and went out as one distraught to wander upon the seashore. Then, when he saw dawn breaking over beach and sea, he yoked his horses to his chariot, and bound the body of Hector behind it that he might drag it about. Thrice did he drag it round the tomb of the son of Menoetius, and then went back into his tent, leaving the body on the ground full length and with its face downwards. But Apollo would not suffer it to be disfigured, for he pitied the man, dead though he now was; therefore he shielded him with his golden aegis continually, that he might take no hurt while Achilles was dragging him.",
          "Thus shamefully did Achilles in his fury dishonour Hector; but the blessed gods looked down in pity from heaven, and urged Mercury, slayer of Argus, to steal the body. All were of this mind save only Juno, Neptune, and Jove's grey-eyed daughter, who persisted in the hate which they had ever borne towards Ilius with Priam and his people; for they forgave not the wrong done them by Alexandrus in disdaining the goddesses who came to him when he was in his sheepyards, and preferring her who had offered him a wanton to his ruin.",
          "When, therefore, the morning of the twelfth day had now come, Phoebus Apollo spoke among the immortals saying, \"You gods ought to be ashamed of yourselves; you are cruel and hard-hearted. Did not Hector burn you thigh-bones of heifers and of unblemished goats? And now dare you not rescue even his dead body, for his wife to look upon, with his mother and child, his father Priam, and his people, who would forthwith commit him to the flames, and give him his due funeral rites? So, then, you would all be on the side of mad Achilles, who knows neither right nor ruth? He is like some savage lion that in the pride of his great strength and daring springs upon men's flocks and gorges on them. Even so has Achilles flung aside all pity, and all that conscience which at once so greatly banes yet greatly boons him that will heed it. man may lose one far dearer than Achilles has lost- a son, it may be, or a brother born from his own mother's womb; yet when he has mourned him and wept over him he will let him bide, for it takes much sorrow to kill a man; whereas Achilles, now that he has slain noble Hector, drags him behind his chariot round the tomb of his comrade. It were better of him, and for him, that he should not do so, for brave though he be we gods may take it ill that he should vent his fury upon dead clay.\"",
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
