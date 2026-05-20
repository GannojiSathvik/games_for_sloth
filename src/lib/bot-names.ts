// src/lib/bot-names.ts
// Pool of bot names drawn from the user's curated list.
// Each bot gets a unique name picked at random (no duplicates per game).

export const BOT_NAMES = [
  // Villains & Historical
  "Adolf Hitler", "Osama bin Laden", "Saddam Hussein", "Joseph Stalin",
  "Benito Mussolini", "Pol Pot", "Kim Jong-un", "Mao Zedong",
  "Vladimir Lenin", "Fidel Castro", "Muammar Gaddafi", "Idi Amin",
  "Vlad the Impaler", "Genghis Khan", "Attila the Hun", "Nero",
  "Caligula", "Rasputin", "Ivan the Terrible", "Torquemada",
  "Napoleon Bonaparte", "Julius Caesar", "Alexander the Great",
  "Che Guevara", "Pablo Escobar", "Al Capone", "Ted Bundy",

  // Fictional Villains
  "Hannibal Lecter", "Darth Vader", "Emperor Palpatine", "Sauron",
  "Voldemort", "Thanos", "Loki", "Joker", "Bane", "Magneto",
  "Doctor Doom", "Freddy Krueger", "Jason Voorhees", "Michael Myers",
  "Pennywise", "Walter White", "Saul Goodman", "Gustavo Fring",
  "Tony Montana", "Don Corleone", "Tommy Shelby", "Patrick Bateman",
  "Homelander", "Omni-Man",

  // Anime
  "Light Yagami", "Johan Liebert", "Madara Uchiha", "Sukuna",
  "Dio Brando", "Eren Yeager", "Levi Ackerman", "Gojo Satoru",

  // Sports
  "Cristiano Ronaldo", "Lionel Messi", "Neymar Jr.", "Kylian Mbappé",
  "Zlatan Ibrahimović", "Diego Maradona", "Pelé", "Ronaldinho",
  "David Beckham", "Sergio Ramos", "Luka Modrić",
  "Virat Kohli", "MS Dhoni", "Rohit Sharma", "Sachin Tendulkar",
  "Shaquille O'Neal", "Michael Jordan", "LeBron James", "Kobe Bryant",
  "Stephen Curry", "Tom Brady", "Conor McGregor", "Khabib Nurmagomedov",
  "Mike Tyson", "Muhammad Ali", "Usain Bolt",
  "Novak Djokovic", "Roger Federer", "Rafael Nadal",

  // F1
  "Max Verstappen", "Lewis Hamilton", "Ayrton Senna",
  "Michael Schumacher", "Fernando Alonso", "Charles Leclerc",
  "Lando Norris", "Sebastian Vettel", "Kimi Räikkönen",
  "Daniel Ricciardo", "Oscar Piastri", "George Russell",
  "Sergio Pérez", "Yuki Tsunoda", "Nico Rosberg", "Niki Lauda",
  "Enzo Ferrari",

  // Tech & Pop Culture
  "Elon Musk", "Mark Zuckerberg", "Jeff Bezos", "Steve Jobs",
  "Bill Gates", "Andrew Tate", "Barack Obama", "Vladimir Putin",
  "Donald Trump", "Kim Kardashian", "Kanye West",
  "Keanu Reeves", "Johnny Depp", "Arnold Schwarzenegger",
  "Dwayne Johnson", "MrBeast",

  // Absurd Combos
  "Adolf Verstappen", "Osama Ronaldo", "Stalin Hamilton",
  "Mussolini Schumacher", "Kim Jong Norris", "Genghis Leclerc",
  "Vlad Vettel", "Saddam Senna", "Mao McLaren", "Pol Pot Piastri",
  "Joker Verstappen", "Darth Hamilton", "Voldemort Alonso",
  "Sauron Schumacher", "Thanos Tsunoda", "Homelander Norris",
  "Ragnar Verstappen", "Caesar Hamilton", "Escobar Leclerc",
  "Rasputin Räikkönen",
];

/**
 * Pick `count` unique random names from the pool.
 * If count > pool size, names get a suffix to stay unique.
 */
export function pickBotNames(count: number, excludeNames: string[] = []): string[] {
  const available = BOT_NAMES.filter(n => !excludeNames.includes(n));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const picked: string[] = [];

  for (let i = 0; i < count; i++) {
    if (i < shuffled.length) {
      picked.push(shuffled[i]);
    } else {
      // Fallback: use a name with a number suffix
      picked.push(`${shuffled[i % shuffled.length]} #${Math.floor(i / shuffled.length) + 1}`);
    }
  }
  return picked;
}
