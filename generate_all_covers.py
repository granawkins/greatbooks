#!/usr/bin/env python3
"""Generate cover art for all books in the database."""

import subprocess
import sys

BOOKS = [
    ("aristotle-ethics", "Nicomachean Ethics", "Aristotle",
     "A golden mean — a perfectly balanced bronze scale with one side holding a laurel and the other an olive branch, on a marble surface"),
    ("aristotle-poetics", "Poetics", "Aristotle",
     "A pair of ancient Greek theatrical masks — one tragic, one comic — carved in weathered marble, resting side by side"),
    ("aristotle-politics", "Politics", "Aristotle",
     "A marble voting pebble (psephos) resting on the steps of a Greek civic building"),
    ("augustine-confessions", "Confessions", "Augustine",
     "A pear on a stone windowsill, lit by late afternoon light — evoking the famous pear theft"),
    ("austen-emma", "Emma", "Jane Austen",
     "A painted hand fan, half-open, resting on a writing desk beside a sealed letter"),
    ("austen-pride-and-prejudice", "Pride and Prejudice", "Jane Austen",
     "A pair of white kid gloves left on a polished wooden hall table beside a calling card"),
    ("cervantes-don-quixote", "Don Quixote", "Miguel de Cervantes",
     "A battered barber's basin worn as a helmet, sitting on a dusty wooden table"),
    ("chaucer-canterbury-tales", "The Canterbury Tales", "Geoffrey Chaucer",
     "A medieval pilgrim's badge — a pewter shell brooch pinned to weathered cloth"),
    ("conrad-heart-of-darkness", "Heart of Darkness", "Joseph Conrad",
     "A steamboat's rusted smokestack rising from dense fog on dark water"),
    ("dante-divine-comedy", "The Divine Comedy", "Dante Alighieri",
     "A dark forest path narrowing into shadow, with a faint distant light at the vanishing point"),
    ("darwin-origin-of-species", "On the Origin of Species", "Charles Darwin",
     "A collection of finch beaks — four or five different specimens arranged on aged paper, as in a naturalist's notebook"),
    ("descartes-discourse-on-method", "Discourse on the Method", "René Descartes",
     "A single lit candle reflected in a glass lens on a dark desk — evoking the solitary thinker"),
    ("dostoevsky-brothers-karamazov", "The Brothers Karamazov", "Fyodor Dostoevsky",
     "A heavy iron Orthodox cross lying on rough wooden planks"),
    ("eliot-middlemarch", "Middlemarch", "George Eliot",
     "A brass microscope on a Victorian writing desk, with a small specimen slide beside it"),
    ("epictetus-discourses", "Discourses", "Epictetus",
     "A broken iron shackle, open, resting on a stone bench — evoking Epictetus's years as a slave"),
    ("goethe-faust", "Faust", "Johann Wolfgang von Goethe",
     "An alchemist's glass retort flask filled with a faintly glowing liquid, on a cluttered study desk"),
    ("hamilton-federalist", "The Federalist Papers", "Alexander Hamilton, James Madison, & John Jay",
     "A quill pen resting on a stack of broadsheet newspapers, ink still wet"),
    ("herodotus-histories", "The Histories", "Herodotus",
     "An ancient world map incised on a bronze disc — a mappa mundi with the Mediterranean at center"),
    ("hobbes-leviathan", "Leviathan", "Thomas Hobbes",
     "A massive crown composed of hundreds of tiny human figures — evoking the frontispiece of Leviathan"),
    ("homer-iliad", "The Iliad", "Homer",
     "The Shield of Achilles — a vast bronze shield with hammered scenes of cities, fields, and dancing"),
    ("homer-odyssey", "The Odyssey", "Homer",
     "Odysseus's great bow, unstrung, lying across a stone threshold"),
    ("hume-enquiry", "An Enquiry Concerning Human Understanding", "David Hume",
     "A billiard ball mid-collision with another on green felt — evoking Hume's causation thought experiment"),
    ("kant-critique-of-pure-reason", "Critique of Pure Reason", "Immanuel Kant",
     "A prism splitting a beam of white light into a spectrum, on a dark laboratory table"),
    ("kierkegaard-fear-and-trembling", "Fear and Trembling", "Søren Kierkegaard",
     "A knife laid across a bundle of firewood on a stone altar on a mountaintop — the binding of Isaac"),
    ("locke-second-treatise", "Second Treatise of Government", "John Locke",
     "An iron key and an open padlock resting on a parchment document"),
    ("lucretius-nature-of-things", "On the Nature of Things", "Lucretius",
     "Dust motes caught in a shaft of sunlight through a dark room — evoking Lucretius's atomic swerve"),
    ("machiavelli-the-prince", "The Prince", "Niccolò Machiavelli",
     "A velvet glove draped over a mailed iron fist, on a dark marble surface"),
    ("marcus-aurelius-meditations", "Meditations", "Marcus Aurelius",
     "A Roman emperor's laurel wreath in gold, set down on a campaign desk beside a wax tablet and stylus"),
    ("melville-moby-dick", "Moby Dick", "Herman Melville",
     "A single white whale's tooth (scrimshaw) etched with a whaling scene, resting on a coil of rope"),
    ("milton-paradise-lost", "Paradise Lost", "John Milton",
     "A single dark angel's wing, half-furled, feathers catching a shaft of golden light"),
    ("montaigne-essays", "Essays", "Michel de Montaigne",
     "A tower room's round window looking out over fields — evoking Montaigne's library tower"),
    ("nietzsche-beyond-good-and-evil", "Beyond Good and Evil", "Friedrich Nietzsche",
     "A stone bridge arching over an abyss in mountain fog — evoking the tightrope walker and the Übermensch"),
    ("pascal-pensees", "Pensées", "Blaise Pascal",
     "A folded piece of parchment sewn into the lining of a coat — evoking Pascal's Memorial"),
    ("plato-apology", "Apology", "Plato",
     "A hemlock cup — a simple clay kylix filled with dark liquid, on a prison stone ledge"),
    ("plato-crito", "Crito", "Plato",
     "Prison door slightly ajar with dawn light streaming through the gap — the escape Socrates refused"),
    ("plato-meno", "Meno", "Plato",
     "Geometric figures drawn in sand with a stick — a square with its diagonal, evoking the slave boy proof"),
    ("plato-phaedo", "Phaedo", "Plato",
     "A swan with wings half-spread on still water at dusk — Socrates compared himself to a dying swan"),
    ("plato-republic", "The Republic", "Plato",
     "A single oil lamp casting light and long shadows on a cave wall"),
    ("plato-symposium", "Symposium", "Plato",
     "A wine krater (large Greek mixing vessel) garlanded with ivy, on a stone table"),
    ("plutarch-lives", "Parallel Lives", "Plutarch",
     "Two ancient coins side by side — one Greek, one Roman — showing profile portraits"),
    ("rousseau-social-contract", "The Social Contract", "Jean-Jacques Rousseau",
     "A set of heavy iron chains broken apart, links scattered on a stone floor"),
    ("shakespeare-hamlet", "Hamlet", "William Shakespeare",
     "A human skull resting on a velvet cushion — Yorick's skull"),
    ("shakespeare-king-lear", "King Lear", "William Shakespeare",
     "A broken crown split into three pieces on a bare heath stone"),
    ("shakespeare-macbeth", "Macbeth", "William Shakespeare",
     "A bloodied dagger floating against absolute darkness"),
    ("shakespeare-othello", "Othello", "William Shakespeare",
     "A delicate embroidered handkerchief with strawberry patterns, crumpled on dark wood"),
    ("shakespeare-the-tempest", "The Tempest", "William Shakespeare",
     "A magician's wooden staff half-buried in beach sand, with storm clouds above"),
    ("smith-wealth-of-nations", "The Wealth of Nations", "Adam Smith",
     "A pin — a single sewing pin magnified, gleaming, on a workshop bench — evoking the pin factory"),
    ("spinoza-ethics", "Ethics", "Baruch Spinoza",
     "A hand-ground glass lens on a cloth beside a half-finished spectacle frame — Spinoza was a lens grinder"),
    ("swift-gullivers-travels", "Gulliver's Travels", "Jonathan Swift",
     "A tiny ornate pocket watch next to an enormous one — suggesting Lilliput's scale"),
    ("tacitus-annals", "The Annals", "Tacitus",
     "A Roman bronze stylus and wax tablet with partially erased text — the historian's instrument"),
    ("thucydides-peloponnesian-war", "History of the Peloponnesian War", "Thucydides",
     "A Greek trireme's bronze ram (embolon) half-submerged in dark Aegean water"),
    ("tocqueville-democracy-in-america", "Democracy in America", "Alexis de Tocqueville",
     "A ballot box made of rough-hewn American wood, sitting on a courthouse step"),
    ("tolstoy-war-and-peace", "War and Peace", "Leo Tolstoy",
     "A French officer's abandoned bicorne hat dusted with snow on a Russian field"),
    ("twain-huckleberry-finn", "Adventures of Huckleberry Finn", "Mark Twain",
     "A makeshift log raft with a lantern hanging from a pole, on a wide dark river at twilight"),
]

PYTHON = ".venv/bin/python"
SCRIPT = ".claude/skills/add-book/img.py"

def main():
    failed = []
    for i, (book_id, title, author, subject) in enumerate(BOOKS):
        print(f"\n[{i+1}/{len(BOOKS)}] {book_id}")
        cmd = [
            PYTHON, SCRIPT,
            "--book-id", book_id,
            "--title", title,
            "--author", author,
            "--subject", subject,
            "--output", f"public/covers/{book_id}.png",
        ]
        try:
            subprocess.run(cmd, check=True, timeout=120)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            print(f"  FAILED: {e}")
            failed.append(book_id)

    print(f"\n\nDone. {len(BOOKS) - len(failed)}/{len(BOOKS)} succeeded.")
    if failed:
        print(f"Failed: {failed}")

if __name__ == "__main__":
    main()
