// External platform roster data for syncing profiles
export interface ExternalRep {
  full_name: string;
  manager_name: string;
  status: string;
}

// Nickname → canonical first name mappings
const NICKNAME_MAP: Record<string, string[]> = {
  william: ['liam', 'will', 'bill', 'billy', 'willy'],
  liam: ['william'],
  matthew: ['matt', 'mathew', 'mat'],
  mathew: ['matthew', 'matt'],
  matt: ['matthew', 'mathew'],
  robert: ['rob', 'bob', 'bobby', 'robby'],
  james: ['jim', 'jimmy', 'jamie'],
  michael: ['mike', 'mikey'],
  nicholas: ['nick', 'nicky'],
  benjamin: ['ben', 'benny'],
  alexander: ['alex'],
  alex: ['alexander'],
  daniel: ['dan', 'danny'],
  jacob: ['jake'],
  jake: ['jacob'],
  joseph: ['joe', 'joey'],
  christopher: ['chris'],
  andrew: ['drew', 'andy'],
  drew: ['andrew'],
  eugene: ['gene'],
  sebastian: ['seb'],
  connor: ['conor'],
};

function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
}

function getNameParts(name: string): string[] {
  return normalizeStr(name).split(/\s+/).filter(Boolean);
}

function areNicknames(a: string, b: string): boolean {
  if (a === b) return true;
  const aNicks = NICKNAME_MAP[a] || [];
  if (aNicks.includes(b)) return true;
  const bNicks = NICKNAME_MAP[b] || [];
  if (bNicks.includes(a)) return true;
  return false;
}

/**
 * Fuzzy match: checks if first and last name parts overlap,
 * accounting for nicknames and middle names.
 * Returns a confidence score 0-1.
 */
export function matchNames(dbName: string, externalName: string): number {
  const dbParts = getNameParts(dbName);
  const extParts = getNameParts(externalName);

  if (dbParts.length === 0 || extParts.length === 0) return 0;

  const dbFirst = dbParts[0];
  const dbLast = dbParts[dbParts.length - 1];
  const extFirst = extParts[0];
  const extLast = extParts[extParts.length - 1];

  // Exact full match
  if (normalizeStr(dbName) === normalizeStr(externalName)) return 1;

  // First + last match (with nicknames)
  const firstMatch = areNicknames(dbFirst, extFirst);
  const lastMatch = dbLast === extLast;

  if (firstMatch && lastMatch) return 0.95;

  // Last name match + first name is substring
  if (lastMatch && (extFirst.startsWith(dbFirst) || dbFirst.startsWith(extFirst))) return 0.85;

  // Last name match only (if last name is distinctive enough, 4+ chars)
  if (lastMatch && dbLast.length >= 4) {
    // Check if any first name part matches
    for (const dp of dbParts) {
      for (const ep of extParts) {
        if (areNicknames(dp, ep) && dp !== dbLast) return 0.8;
      }
    }
    return 0.5;
  }

  return 0;
}

/**
 * Find the best match for an external name in the DB profiles.
 */
export function findBestMatch(
  externalName: string,
  dbProfiles: { full_name: string; user_id: string }[]
): { profile: { full_name: string; user_id: string }; score: number } | null {
  let best: { profile: typeof dbProfiles[0]; score: number } | null = null;

  for (const p of dbProfiles) {
    const score = matchNames(p.full_name, externalName);
    if (score > 0.7 && (!best || score > best.score)) {
      best = { profile: p, score };
    }
  }

  return best;
}

// The full external roster (210 entries)
export const EXTERNAL_ROSTER: ExternalRep[] = [
  { full_name: "Tristan Griffin Reidel", manager_name: "Dean Patrick Vincent", status: "Contract Signed" },
  { full_name: "Nick Steven Odell", manager_name: "Jared Anthony Yates", status: "Contract Signed" },
  { full_name: "Clarke Solo", manager_name: "Adam Matthew Mcelfresh", status: "Contract Signed" },
  { full_name: "Jared Anthony Yates", manager_name: "Athan Vaughn Coberley", status: "Contract Signed" },
  { full_name: "Charles Parker Trippi", manager_name: "Athan Vaughn Coberley", status: "Onboarded" },
  { full_name: "Alex Archuleta", manager_name: "Athan Vaughn Coberley", status: "Contract Signed" },
  { full_name: "Noah Josiah Fry", manager_name: "Ryan Michael Stento", status: "Contract Signed" },
  { full_name: "Vance Christopher Schiller", manager_name: "William James Gardner", status: "Contract Signed" },
  { full_name: "David Zingeser", manager_name: "Israel Oluwaleke John Peters", status: "Contract Signed" },
  { full_name: "Sean Tanner Grden", manager_name: "Greyson Michael Crandall", status: "Contract Signed" },
  { full_name: "Keegan Christian Olson", manager_name: "Ryan Michael Stento", status: "Contract Signed" },
  { full_name: "Zayden Hezekiah Smith", manager_name: "Carver Britt Hess", status: "Contract Signed" },
  { full_name: "Tyjavion Demontre Harper", manager_name: "Carver Britt Hess", status: "Contract Signed" },
  { full_name: "Ryan Michael Stento", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Athan Vaughn Coberley", manager_name: "Ryan Michael Stento", status: "Onboarded" },
  { full_name: "Dustyn Robert Taft", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Elias James Fletcher", manager_name: "Carver Britt Hess", status: "Info Added" },
  { full_name: "James Michael Curtis", manager_name: "Solomon Olusegun Peters", status: "Contract Signed" },
  { full_name: "John David Palladino", manager_name: "Adam Matthew Mcelfresh", status: "Contract Signed" },
  { full_name: "Simon James Chavez", manager_name: "Milo Solomon Lostetter", status: "Onboarded" },
  { full_name: "Quincy Anthony Turner", manager_name: "Brandon Clinton Woods", status: "Onboarded" },
  { full_name: "Austin James Daleo", manager_name: "Matthew Patrick Mcclure", status: "Contract Signed" },
  { full_name: "Justin Gabriel Lujan", manager_name: "Emory Paul Wamsley", status: "Onboarded" },
  { full_name: "Kyrin Ashton Patterson", manager_name: "Brandon Clinton Woods", status: "Contract Signed" },
  { full_name: "Cristian Ranjit Prince", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Maike Jaronn David Caracciolo", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Milo Solomon Lostetter", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Efi Szatmary", manager_name: "Gideon Ephraim Oladapo Peters", status: "Contract Signed" },
  { full_name: "Juan Manuel Thompson", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Marco Antonio Lopez", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Samuel Zvi Fein", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Huy Truong Hong", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Solomon Olusegun Peters", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Israel Oluwaleke John Peters", manager_name: "Gideon Ephraim Oladapo Peters", status: "Onboarded" },
  { full_name: "Manuela Quintero Acevedo", manager_name: "Brandon Clinton Woods", status: "Onboarded" },
  { full_name: "Hayden Christian Kroll", manager_name: "Mason David Batt", status: "Onboarded" },
  { full_name: "Aiden John Harl Plumley", manager_name: "Mason David Batt", status: "Onboarded" },
  { full_name: "Connor Jackson Simon", manager_name: "William James Gardner", status: "Contract Signed" },
  { full_name: "Aiden Barjam Arifi", manager_name: "Troy Thomas Dela Vega", status: "Contract Signed" },
  { full_name: "Andre Israel Moore", manager_name: "Brandon Clinton Woods", status: "Contract Signed" },
  { full_name: "Brandon Patrick Ayers", manager_name: "Brandon Clinton Woods", status: "Contract Signed" },
  { full_name: "Ellen Rose Wheeler Glaser", manager_name: "Mason David Batt", status: "Onboarded" },
  { full_name: "Archie Walker", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Gideon Ephraim Oladapo Peters", manager_name: "Elijah Joseph Romero Hughes", status: "Onboarded" },
  { full_name: "Bradley Mccullough", manager_name: "Mitchell Madison Ingram Bailey", status: "Contract Signed" },
  { full_name: "Pedro Santos Gate", manager_name: "William James Gardner", status: "Contract Signed" },
  { full_name: "Dylan Cole Duvall", manager_name: "Jordan Lee Trotter", status: "Contract Signed" },
  { full_name: "Layton Jameson Reese", manager_name: "Jordan Lee Trotter", status: "Onboarded" },
  { full_name: "Brandon Clinton Woods", manager_name: "Jordan Lee Trotter", status: "Onboarded" },
  { full_name: "Diego Armando Cruz", manager_name: "Mikail Harms Hassoun", status: "Contract Signed" },
  { full_name: "Evin Anthony Gallagher", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Antonio Tadeo Villegas", manager_name: "Elijah Joseph Romero Hughes", status: "Contract Signed" },
  { full_name: "Logan Bruce William Curran", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Brandon Lee Anderson", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Kayan Eugene Cobb", manager_name: "Branson Christopher Liles", status: "Onboarded" },
  { full_name: "Zane Tinawi", manager_name: "Joshua Bingham", status: "Contract Signed" },
  { full_name: "Eden Martin Hayes", manager_name: "Jordan Lee Trotter", status: "Contract Signed" },
  { full_name: "Elijah Joseph Romero Hughes", manager_name: "Jordan Lee Trotter", status: "Onboarded" },
  { full_name: "Satchel Vani Poplar", manager_name: "Elijah Abraham Wiater", status: "Onboarded" },
  { full_name: "Leon Jenero Louie Jr", manager_name: "Elijah Abraham Wiater", status: "Onboarded" },
  { full_name: "Greyson Michael Crandall", manager_name: "Brendon Austin Luke", status: "Info Added" },
  { full_name: "Cole Joseph Kretman", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Jeremy William Magoon Ii", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Garrett Robert Hayden", manager_name: "Hassan Omer Hassan Ahmed Sati", status: "Contract Signed" },
  { full_name: "Emory Paul Wamsley", manager_name: "Brendon Austin Luke", status: "Onboarded" },
  { full_name: "Carver Britt Hess", manager_name: "Jordan Lee Trotter", status: "Onboarded" },
  { full_name: "Jordan Lee Trotter", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "George Mcdermott Peter", manager_name: "Dean Patrick Vincent", status: "Onboarded" },
  { full_name: "Nathan Corbin Wundrow", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Samuel Jayden Rode", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Louis Alberto Vera", manager_name: "Jack Dawson Spiess", status: "Onboarded" },
  { full_name: "Lucien Follen", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Cyrus Micah Marks", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Alexander Wyatt Walker", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Isaac Herrera", manager_name: "Jake Dennis Keller", status: "Contract Signed" },
  { full_name: "Dylan Edward Pihalja", manager_name: "Elijah Abraham Wiater", status: "Onboarded" },
  { full_name: "Angelo Valentino Rea", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Daniel Adeeb Daniel", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Isaac Joseph Sexton", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Jackson Gill Wilson", manager_name: "Brendon Austin Luke", status: "Onboarded" },
  { full_name: "John Joseph Weiland", manager_name: "Branson Christopher Liles", status: "Contract Signed" },
  { full_name: "Kefir Standifird", manager_name: "Branson Christopher Liles", status: "Info Added" },
  { full_name: "Branson Christopher Liles", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Brendon Austin Luke", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Braxten Chase Richard Olson", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Michael Andrew Jamieson", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Kole Matthew Olsick", manager_name: "Elijah Abraham Wiater", status: "Onboarded" },
  { full_name: "Layne Stephen Duke", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Gianna Rose Wilson", manager_name: "William James Gardner", status: "Contract Signed" },
  { full_name: "Dorian Wayne Guyot", manager_name: "Dean Patrick Vincent", status: "Contract Signed" },
  { full_name: "Jaxson Pottenger", manager_name: "Hewitt Brandon Mcbride", status: "Contract Signed" },
  { full_name: "Sebastian Charles Langella", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Kyler Michael Harrington", manager_name: "Gabriel Joseph Salvatore Brugellis", status: "Onboarded" },
  { full_name: "Blake Christopher Hendricks", manager_name: "Gabriel Joseph Salvatore Brugellis", status: "Onboarded" },
  { full_name: "Evelina Rain Miller", manager_name: "Sean Douglas Jablonski", status: "Contract Signed" },
  { full_name: "Aidenn Matthew Kelly", manager_name: "Justin William Handy", status: "Contract Signed" },
  { full_name: "Zae Christopher Wyatt", manager_name: "Joshua Bingham", status: "Contract Signed" },
  { full_name: "Teagan Jayce Roumayah", manager_name: "Mathew Peter Rubino", status: "Onboarded" },
  { full_name: "Bobby Michael Lindsey", manager_name: "Sean Douglas Jablonski", status: "Contract Signed" },
  { full_name: "Jace Caden Pina", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Matthew Patrick Mcclure", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Nicholas Randall Haney", manager_name: "Hewitt Brandon Mcbride", status: "Onboarded" },
  { full_name: "Tedla Alemu Campbell", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Chad Mitchell Lantow", manager_name: "Ian Reilly Mcclurg", status: "Contract Signed" },
  { full_name: "Jamaal Petty", manager_name: "Hewitt Brandon Mcbride", status: "Contract Signed" },
  { full_name: "Justin William Handy", manager_name: "Jacob Eugene Handy", status: "Onboarded" },
  { full_name: "Zeke Scott Wedgbury", manager_name: "Mikail Harms Hassoun", status: "Contract Signed" },
  { full_name: "Kingston Ryder Miller", manager_name: "Christopher Cole Wright", status: "Onboarded" },
  { full_name: "Brooke Kristina Lockwood", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Mikail Harms Hassoun", manager_name: "Jayce Christian Nelson", status: "Info Added" },
  { full_name: "Christian Orlando Rivera", manager_name: "Troy Thomas Dela Vega", status: "Contract Signed" },
  { full_name: "Alex Fradis", manager_name: "Adam Matthew Mcelfresh", status: "Contract Signed" },
  { full_name: "Jacob Eugene Handy", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Nathan Charles Kraus", manager_name: "Gabe Thomas Perron", status: "Onboarded" },
  { full_name: "Anthony Steben Mccaw", manager_name: "Troy Thomas Dela Vega", status: "Contract Signed" },
  { full_name: "Jack William Hickman", manager_name: "Joshua Bingham", status: "Contract Signed" },
  { full_name: "Morgan Christine Mckillican", manager_name: "Jessica Lynne Johnson", status: "Info Added" },
  { full_name: "Liam Lynch Boyd", manager_name: "Dean Patrick Vincent", status: "Onboarded" },
  { full_name: "Dariel Emmanuel Perez", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Justin Scott Teal", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Aria Remi Valiyee", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Logan Michael Gleeson", manager_name: "Ian Reilly Mcclurg", status: "Onboarded" },
  { full_name: "Dean Patrick Vincent", manager_name: "Jacob Robert Jazwin", status: "Onboarded" },
  { full_name: "Alvin Toe", manager_name: "Corey John Haden Morgan", status: "Contract Signed" },
  { full_name: "James Van Der Neut", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Joshua Anthony Schinasi", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Mitchell Ryan Sullivan", manager_name: "Corey John Haden Morgan", status: "Onboarded" },
  { full_name: "Trevor Michael Payne", manager_name: "Mitchell Madison Ingram Bailey", status: "Onboarded" },
  { full_name: "Spencer Henry Wilson", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Benjamin Bernard Marcondes", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Cannon Ridge Johnson", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Logan James Mccarty", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Kao Destin Dillinger", manager_name: "Hassan Omer Hassan Ahmed Sati", status: "Contract Signed" },
  { full_name: "Robert David Brogan", manager_name: "Ian Reilly Mcclurg", status: "Contract Signed" },
  { full_name: "Anthony Louis Morreale", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Aristoteles Stelios Muench Mavridoglou", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Jacob Robert Jazwin", manager_name: "Hassan Omer Hassan Ahmed Sati", status: "Onboarded" },
  { full_name: "George Wendell John Iii Burney", manager_name: "Corey John Haden Morgan", status: "Onboarded" },
  { full_name: "Ladainian Dominic Strausbaugh", manager_name: "Troy Thomas Dela Vega", status: "Contract Signed" },
  { full_name: "Jack Douglas Cahill", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Dorsett Anthony Wright", manager_name: "Nicholas Singh Batth", status: "Onboarded" },
  { full_name: "Hassan Omer Hassan Ahmed Sati", manager_name: "Joshua Robert Hecocks", status: "Onboarded" },
  { full_name: "Peter Joshua Tasca", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Nicholas Singh Batth", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Jaalam Ahmon Scott", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Brian Arther Knuutti", manager_name: "Hunter Terry Shannon", status: "Contract Signed" },
  { full_name: "Forrest Deming Love", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Keller Wilson O Halloran", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Owen Austin Boyle", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Jayce Christian Nelson", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "David Navarro Marsili", manager_name: "Hunter Terry Shannon", status: "Info Added" },
  { full_name: "Jack William Robbins", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Ethan James Arellano", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Corey John Haden Morgan", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Gabriel Bryce Griffith", manager_name: "Mathew Peter Rubino", status: "Onboarded" },
  { full_name: "Mykise Dion Jenkins", manager_name: "Caleb Ryan Hammond", status: "Onboarded" },
  { full_name: "Nicholas Alexander Meilbeck", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Dangelo Charles Fitzpatrick", manager_name: "Caleb Ryan Hammond", status: "Onboarded" },
  { full_name: "Isaac Sanz", manager_name: "Ian Reilly Mcclurg", status: "Contract Signed" },
  { full_name: "Eugene Pieter Niemann", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Troy Thomas Dela Vega", manager_name: "Adam Matthew Mcelfresh", status: "Onboarded" },
  { full_name: "Alexander John Justice", manager_name: "Mathew Peter Rubino", status: "Onboarded" },
  { full_name: "Marianna Elaine Soper", manager_name: "Ian Reilly Mcclurg", status: "Onboarded" },
  { full_name: "Dominic Salvatore Guido", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Gabe Thomas Perron", manager_name: "Mathew Peter Rubino", status: "Summer Ready" },
  { full_name: "Dane Christian Kessler", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Vishal Mitra", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Ian Reilly Mcclurg", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Spencer Dougherty Westbrook", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Jacob Italo Chiuchiarelli", manager_name: "Mathew Peter Rubino", status: "Onboarded" },
  { full_name: "Ryan Stanley Burnham", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Christopher Cole Wright", manager_name: "Jack Dawson Spiess", status: "Onboarded" },
  { full_name: "Adam Matthew Mcelfresh", manager_name: "Joshua Bingham", status: "Onboarded" },
  { full_name: "Elijah Abraham Wiater", manager_name: "Luc Robert Chevalier", status: "Onboarded" },
  { full_name: "Joshua Bingham", manager_name: "Mathew Daniel Joyce", status: "Onboarded" },
  { full_name: "Orion Patrick Tucker", manager_name: "Mitchell Madison Ingram Bailey", status: "Onboarded" },
  { full_name: "Caleb Ryan Hammond", manager_name: "Mathew Peter Rubino", status: "Onboarded" },
  { full_name: "Cayden Andrew Fleming", manager_name: "Mathew Daniel Joyce", status: "Onboarded" },
  { full_name: "Jack Dawson Spiess", manager_name: "Mathew Peter Rubino", status: "Onboarded" },
  { full_name: "Hewitt Brandon Mcbride", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Dominic Jason Aponte", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Caleb John Saragina", manager_name: "James Jay Harjak", status: "Onboarded" },
  { full_name: "Ryder Jericho Johnson", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Jadon Micheal Aaron Flynn Fisher", manager_name: "Mitchell Madison Ingram Bailey", status: "Onboarded" },
  { full_name: "Drew Charles Dittus", manager_name: "Troy Thomas Dela Vega", status: "Onboarded" },
  { full_name: "Alexander Conescu", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Mason Lee Hess", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Devin Robert Stuffmann", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Jacob Tyler Jones", manager_name: "Spencer John Yanbin Mamrick", status: "Info Added" },
  { full_name: "Mathew Peter Rubino", manager_name: "Luc Robert Chevalier", status: "Onboarded" },
  { full_name: "Ashton Tetmeyer", manager_name: "Mathew Daniel Joyce", status: "Contract Signed" },
  { full_name: "Mason David Batt", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Barrett Layne Carrancho", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Trevin Clayton Jensen Rose", manager_name: "Colton Joyce", status: "Contract Signed" },
  { full_name: "Lucas Ferreira Martins", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Cassius Witt Bradbury", manager_name: "Justin Gordon Casarotti", status: "Onboarded" },
  { full_name: "Daniel Kaenig", manager_name: "Colton Joyce", status: "Contract Signed" },
  { full_name: "Brody Hunter Ruoff", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Cameron Thomas Rounds", manager_name: "Colton Joyce", status: "Info Added" },
  { full_name: "Luc Robert Chevalier", manager_name: "Mathew Daniel Joyce", status: "Onboarded" },
  { full_name: "James Jay Harjak", manager_name: "Colton Joyce", status: "Onboarded" },
  { full_name: "Justin Gordon Casarotti", manager_name: "William James Gardner", status: "Onboarded" },
  { full_name: "Jesus Alvarez Alvarez", manager_name: "Luc Robert Chevalier", status: "Onboarded" },
  { full_name: "Joseph Thomas Grob", manager_name: "Hunter Terry Shannon", status: "Onboarded" },
  { full_name: "Gabriel Joseph Salvatore Brugellis", manager_name: "Sean Douglas Jablonski", status: "Onboarded" },
  { full_name: "Mitchell Madison Ingram Bailey", manager_name: "Luc Robert Chevalier", status: "Onboarded" },
  { full_name: "William James Gardner", manager_name: "Mathew Daniel Joyce", status: "Onboarded" },
  { full_name: "Sean Douglas Jablonski", manager_name: "Mathew Daniel Joyce", status: "Onboarded" },
  { full_name: "Hunter Terry Shannon", manager_name: "Mathew Daniel Joyce", status: "Onboarded" },
  { full_name: "Colton Joyce", manager_name: "Mathew Daniel Joyce", status: "Summer Ready" },
];
