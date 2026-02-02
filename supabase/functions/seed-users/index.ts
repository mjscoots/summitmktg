import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All active users (NLC excluded)
const users = [
  { full_name: "Cole Joseph Kretman", email: "colejkret@icloud.com", phone: "7155546228", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Garrett Robert Hayden", email: "garrett2202@gmail.com", phone: "7606103081", role: "rookie", direct_manager: "Hassan Omer Hassan Ahmed Sati" },
  { full_name: "Emory Paul Wamsley", email: "emorywamsley@icloud.com", phone: "4804176542", role: "rookie", direct_manager: "Brendon Austin Luke" },
  { full_name: "George Mcdermott Peter", email: "georgepetar58@gmail.com", phone: "4083756623", role: "rookie", direct_manager: "Dean Patrick Vincent" },
  { full_name: "Nathan Corbin Wundrow", email: "wundrow@gmail.com", phone: "7155541041", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Samuel Jayden Rode", email: "samrode42@gmail.com", phone: "7634022676", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Lucien Follen", email: "lucienfollen@gmail.com", phone: "9205348434", role: "manager", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Cyrus Micah Marks", email: "cyrusmarks282@gmail.com", phone: "7345872242", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Alexander Wyatt Walker", email: "awalker112211@gmail.com", phone: "2489543990", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Isaac Herrera", email: "isaacherrera035@gmail.com", phone: "4803230317", role: "rookie", direct_manager: "Jake Dennis Keller" },
  { full_name: "Dylan Edward Pihalja", email: "depihalja12@gmail.com", phone: "8109867519", role: "rookie", direct_manager: "Elijah Abraham Wiater" },
  { full_name: "Cody Galaviz", email: "codygalaviz1@gmail.com", phone: "6022958335", role: "rookie", direct_manager: "Jack Dawson Spiess" },
  { full_name: "Daniel Adeeb Daniel", email: "dan.daniel1819@gmail.com", phone: "6156354445", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Isaac Joseph Sexton", email: "isaacsexton619@gmail.com", phone: "4192628216", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Jack Gill Wilson", email: "jackwilsonaz1@gmail.com", phone: "4806624034", role: "rookie", direct_manager: "Brendon Austin Luke" },
  { full_name: "John Joseph Weiland", email: "johnquarter3@gmail.com", phone: "6026436422", role: "rookie", direct_manager: "Branson Christopher Liles" },
  { full_name: "Kefir Standifird", email: "standifirdkefir@gmail.com", phone: "4809329817", role: "rookie", direct_manager: "Branson Christopher Liles" },
  { full_name: "Branson Christopher Liles", email: "bransonliles@gmail.com", phone: "6026188863", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Brendon Austin Luke", email: "bluke480@gmail.com", phone: "4806513457", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Braxten Chase Richard Olson", email: "olsonbraxten1@gmail.com", phone: "4795346897", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Michael Andrew Jamieson", email: "mjamieson731@gmail.com", phone: "2035204573", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Kole Matthew Olsick", email: "koleman1227@gmail.com", phone: "8104989697", role: "rookie", direct_manager: "Elijah Abraham Wiater" },
  { full_name: "Layne Stephen Duke", email: "layneog97@gmail.com", phone: "7155536588", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Julian Abelino Trujillo", email: "m0nk3y9756@gmail.com", phone: "5052280186", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Gianna Rose Wilson", email: "ggiawilsonn@gmail.com", phone: "4154971097", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Dorian Wayne Guyot", email: "dorianwguyot@gmail.com", phone: "8583541993", role: "rookie", direct_manager: "Dean Patrick Vincent" },
  { full_name: "Jaxson Pottenger", email: "jaxsonpottenger18@gmail.com", phone: "8433380286", role: "rookie", direct_manager: "Hewitt Brandon Mcbride" },
  { full_name: "Sebastian Charles Langella", email: "sebastianlangella@gmail.com", phone: "8056991880", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Kyler Michael Harrington", email: "kharrington728@gmail.com", phone: "5172976550", role: "rookie", direct_manager: "Gabriel Joseph Salvatore Brugellis" },
  { full_name: "Blake Christopher Hendricks", email: "hendricksinc22@gmail.com", phone: "8455007392", role: "rookie", direct_manager: "Gabriel Joseph Salvatore Brugellis" },
  { full_name: "Evelina Rain Miller", email: "rainmiller033@gmail.com", phone: "8289338447", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Aidenn Matthew Kelly", email: "aidenn24@gmail.com", phone: "9088757226", role: "rookie", direct_manager: "Justin William Handy" },
  { full_name: "Zae Christopher Wyatt", email: "zaelynnwyatt@gmail.com", phone: "4699516807", role: "manager", direct_manager: "Joshua Bingham" },
  { full_name: "Teagan Jayce Roumayah", email: "teaganjayce@gmail.com", phone: "2489818408", role: "rookie", direct_manager: "Mathew Peter Rubino" },
  { full_name: "Gavin Xavier Reddington", email: "reddingtongavin@gmail.com", phone: "7327204475", role: "rookie", direct_manager: "Justin William Handy" },
  { full_name: "Bobby Michael Lindsey", email: "boblindzjr@gmail.com", phone: "7344079690", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Jace Caden Pina", email: "pinajace@gmail.com", phone: "4804863745", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Max Patrick Mcclure", email: "matt.mcclure.p@gmail.com", phone: "4807094927", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Nicholas Randall Haney", email: "stnick2005@outlook.com", phone: "3463759875", role: "rookie", direct_manager: "Hewitt Brandon Mcbride" },
  { full_name: "Tedla Alemu Campbell", email: "tedlacampbell1@gmail.com", phone: "4846788488", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Chad Mitchell Lantow", email: "cmlantow@gmail.com", phone: "9105245489", role: "rookie", direct_manager: "Ian Reilly Mcclurg" },
  { full_name: "Jamaal Petty", email: "pettmood88@gmail.com", phone: "6823627707", role: "rookie", direct_manager: "Hewitt Brandon Mcbride" },
  { full_name: "Justin William Smith", email: "justinwsmith2025@gmail.com", phone: "9736689195", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Justin William Handy", email: "justinhandy444@gmail.com", phone: "7323798154", role: "rookie", direct_manager: "Jacob Eugene Handy" },
  { full_name: "Zeke Scott Wedgbury", email: "zwedgbury27@gmail.com", phone: "3192522094", role: "manager", direct_manager: "Mikail Harms Hassoun" },
  { full_name: "Gio Aldo Lizzul", email: "giolizzul@icloud.com", phone: "6026960596", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Kingston Ryder Miller", email: "kryder12908@gmail.com", phone: "2482382042", role: "rookie", direct_manager: "Christopher Cole Wright" },
  { full_name: "Brooke Kristina Lockwood", email: "blockwood1928@gmail.com", phone: "4106086304", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Mikail Harms Hassoun", email: "kailhass28@gmail.com", phone: "5154433322", role: "manager", direct_manager: "Jayce Christian Nelson" },
  { full_name: "Christian Orlando Rivera", email: "christianriv2003@gmail.com", phone: "2035778795", role: "manager", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Alex Fradis", email: "drfradis@gmail.com", phone: "3102699911", role: "manager", direct_manager: "Adam Matthew Mcelfresh" },
  { full_name: "Jacob Eugene Handy", email: "handyjacob362@gmail.com", phone: "7328501160", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Aidan Pritam Mouton", email: "mouton8327@gmail.com", phone: "5865519014", role: "rookie", direct_manager: "Luc Robert Chevalier" },
  { full_name: "Nathan Charles Kraus", email: "natedog0506@icloud.com", phone: "9474659858", role: "manager", direct_manager: "Gabe Thomas Perron" },
  { full_name: "Anthony Steben Mccaw", email: "anthony.mccaw96@gmail.com", phone: "9096729127", role: "manager", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Jack William Hickman", email: "jackhickman30@gmail.com", phone: "4808437279", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Morgan Christine Mckillican", email: "morganmckillican4@gmail.com", phone: "8057667156", role: "rookie", direct_manager: "Jessica Lynne Johnson" },
  { full_name: "Liam Lynch Boyd", email: "ljb06@icloud.com", phone: "3172669907", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Dariel Emmanuel Perez", email: "dperez10312@gmail.com", phone: "3473690593", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Justin Scott Teal", email: "justintealoffical@gmail.com", phone: "7029133113", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Aria Remi Valiyee", email: "ariavaliyee13@gmail.com", phone: "9257872090", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Victoria Grace Borsi", email: "victoriaborsi12@gmail.com", phone: "4259549951", role: "rookie", direct_manager: "Jessica Lynne Johnson" },
  { full_name: "Logan Michael Gleeson", email: "empire.777.financial@gmail.com", phone: "4079609024", role: "rookie", direct_manager: "Ian Reilly Mcclurg" },
  { full_name: "Dean Patrick Vincent", email: "deanmachine2007@gmail.com", phone: "4802865215", role: "rookie", direct_manager: "Jacob Robert Jazwin" },
  { full_name: "Alvin Toe", email: "alvintoe155@gmail.com", phone: "4232626846", role: "rookie", direct_manager: "Corey John Haden Morgan" },
  { full_name: "James Van Der Neut", email: "jamesvan0126@gmail.com", phone: "9177545778", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Joshua Anthony Schinasi", email: "joshuaaschinasi116@gmail.com", phone: "9294058406", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Mitchell Ryan Sullivan", email: "mitchellsullivan719@gmail.com", phone: "9168348864", role: "rookie", direct_manager: "Corey John Haden Morgan" },
  { full_name: "Lucas Ezequiel Deiros Jedrysiak", email: "lucasdeirosj@gmail.com", phone: "7134805964", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Trevor Michael Payne", email: "spidertrev26@gmail.com", phone: "7576309192", role: "rookie", direct_manager: "Mitchell Madison Ingram Bailey" },
  { full_name: "Spencer Henry Wilson", email: "swfinancepro@gmail.com", phone: "4157607900", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Benjamin Bernard Marcondes", email: "benjaminbmarcondes@gmail.com", phone: "4152502710", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Jake Dennis Keller", email: "jacobdkeller@icloud.com", phone: "9136341407", role: "manager", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Cannon Ridge Johnson", email: "theridge707@icloud.com", phone: "7074729963", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Logan James Mccarty", email: "logan.mccarty19@gmail.com", phone: "5594743054", role: "manager", direct_manager: "Colton Joyce" },
  { full_name: "Kao Destin Dillinger", email: "kaodillinger37@hotmail.com", phone: "6025109665", role: "rookie", direct_manager: "Hassan Omer Hassan Ahmed Sati" },
  { full_name: "Robert David Brogan", email: "davidbragan2@gmail.com", phone: "7652741310", role: "rookie", direct_manager: "Ian Reilly Mcclurg" },
  { full_name: "Anthony Louis Morreale", email: "anthonymorr30@gmail.com", phone: "7742420802", role: "manager", direct_manager: "Joshua Bingham" },
  { full_name: "Aristoteles Stelios Muench Mavridoglou", email: "aristotlemm@icloud.com", phone: "4153429902", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Jacob Robert Jazwin", email: "jakejazwin@gmail.com", phone: "4804504754", role: "rookie", direct_manager: "Hassan Omer Hassan Ahmed Sati" },
  { full_name: "George Wendell John Iii Burney", email: "georgeburney4@gmail.com", phone: "6617798027", role: "rookie", direct_manager: "Corey John Haden Morgan" },
  { full_name: "Ladainian Dominic Strausbaugh", email: "dainstrausbaugh@gmail.com", phone: "7178048570", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Jack Douglas Cahill", email: "jdcahill428@gmail.com", phone: "2038071769", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Dorsett Anthony Wright", email: "wrightdorsett@gmail.com", phone: "9257274551", role: "rookie", direct_manager: "Nicholas Singh Batth" },
  { full_name: "Jose Julian Garcia Gutierrez", email: "jgarciagutierrez2005@gmail.com", phone: "7077741070", role: "rookie", direct_manager: "Seth Michael Dyer" },
  { full_name: "Hassan Omer Hassan Ahmed Sati", email: "hazzzysati21@gmail.com", phone: "6023867717", role: "rookie", direct_manager: "Joshua Robert Hecocks" },
  { full_name: "Peter Joshua Tasca", email: "pjtasca31@gmail.com", phone: "7163446480", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Nicholas Singh Batth", email: "nicholasbatth@gmail.com", phone: "5108820912", role: "manager", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Jaalam Ahmon Scott", email: "jaascott47@gmail.com", phone: "8436074093", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Brian Arther Knuutti", email: "bknuuttijr@icloud.com", phone: "7077823947", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Forrest Deming Love", email: "forrestlove32@gmail.com", phone: "8565374103", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Keller Wilson O Halloran", email: "kellerohalloran@gmail.com", phone: "4157450249", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Owen Austin Boyle", email: "oaboyle23@gmail.com", phone: "2489346300", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Jayce Christian Nelson", email: "jaycenelson1234@gmail.com", phone: "5152044510", role: "manager", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "David Navarro Marsili", email: "dnavarromarsili@gmail.com", phone: "5105700690", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Jack William Robbins", email: "jack_robbins@icloud.com", phone: "6282456524", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Ethan James Arellano", email: "ethanjames8943@gmail.com", phone: "7072927838", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Adin James Casarotti", email: "ajcasarotti20@gmail.com", phone: "7078222562", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Corey John Haden Morgan", email: "coreymorgan7554@gmail.com", phone: "6616623046", role: "manager", direct_manager: "Cole Wesley Bundren" },
  { full_name: "Gabriel Bryce Griffith", email: "gabebgriffith@gmail.com", phone: "5865311059", role: "rookie", direct_manager: "Mathew Peter Rubino" },
  { full_name: "Mykise Dion Jenkins", email: "mykisej43@gmail.com", phone: "5172149785", role: "rookie", direct_manager: "Caleb Ryan Hammond" },
  { full_name: "Nicholas Alexander Meilbeck", email: "nmeilbeck@gmail.com", phone: "4159394472", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Dangelo Charles Fitzpatrick", email: "fitzpatrickdangelo@gmail.com", phone: "5177639577", role: "rookie", direct_manager: "Caleb Ryan Hammond" },
  { full_name: "Isaac Sanz", email: "isaacsaenz21@gmail.com", phone: "4322129282", role: "rookie", direct_manager: "Ian Reilly Mcclurg" },
  { full_name: "Eugene Niemann", email: "eneugene@gmail.com", phone: "7289002484", role: "manager", direct_manager: "Joshua Bingham" },
  { full_name: "Rocco Thomas Scaccalosi", email: "frozenbanana2006@gmail.com", phone: "7073276628", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Troy Thomas Dela Vega", email: "tdvega42@gmail.com", phone: "9254289507", role: "manager", direct_manager: "Adam Matthew Mcelfresh" },
  { full_name: "Alexander John Justice", email: "alexjustice2022@gmail.com", phone: "2488358330", role: "rookie", direct_manager: "Mathew Peter Rubino" },
  { full_name: "Marianna Elaine Soper", email: "marianna88soccer@gmail.com", phone: "5089349023", role: "rookie", direct_manager: "Ian Reilly Mcclurg" },
  { full_name: "Dominic Salvatore Guido", email: "domguido43@gmail.com", phone: "8458208513", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Gabe Thomas Perron", email: "heyitsgabep@gmail.com", phone: "5172454654", role: "manager", direct_manager: "Mathew Peter Rubino" },
  { full_name: "Dane Christian Kessler", email: "danekessler2005@gmail.com", phone: "4157173166", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Vishal Mitra", email: "vm647475@gmail.com", phone: "8456046567", role: "manager", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Ian Reilly Mcclurg", email: "irmcclurg97@gmail.com", phone: "9126750438", role: "rookie", direct_manager: "Joshua Bingham" },
  { full_name: "Spencer Dougherty Westbrook", email: "spencerwestbrook8@gmail.com", phone: "4159365212", role: "rookie", direct_manager: "William James Gardner" },
  { full_name: "Jacob Italo Chiuchiarelli", email: "chiuchiarellijacob79@gmail.com", phone: "2485345414", role: "rookie", direct_manager: "Mathew Peter Rubino" },
  { full_name: "Ryan Stanley Burnham", email: "rburnham99@icloud.com", phone: "7073646196", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Christopher Cole Wright", email: "ccw20021446@icloud.com", phone: "2489332824", role: "rookie", direct_manager: "Jack Dawson Spiess" },
  { full_name: "Adam Matthew Mcelfresh", email: "adammcelfresh1@gmail.com", phone: "6367347439", role: "manager", direct_manager: "Joshua Bingham" },
  { full_name: "Elijah Abraham Wiater", email: "ewiater1221@gmail.com", phone: "5862469364", role: "manager", direct_manager: "Luc Robert Chevalier" },
  { full_name: "Joshua Bingham", email: "joshuabingham4u@gmail.com", phone: "5614038310", role: "manager", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "Orion Patrick Tucker", email: "oriontucker24@gmail.com", phone: "7078373939", role: "rookie", direct_manager: "Mitchell Madison Ingram Bailey" },
  { full_name: "Jackson Lanier Roberson", email: "thejackson0105@gmail.com", phone: "4703949371", role: "rookie", direct_manager: "Spencer John Yanbin Mamrick" },
  { full_name: "Selena Hernandez", email: "se1ena.herna07@gmail.com", phone: "4707604294", role: "rookie", direct_manager: "Spencer John Yanbin Mamrick" },
  { full_name: "Hannah Flinn", email: "hfstout08@gmail.com", phone: "4708725255", role: "rookie", direct_manager: "Skyler Thomas Smith" },
  { full_name: "Caleb Ryan Hammond", email: "calebhammond24@gmail.com", phone: "5179272386", role: "manager", direct_manager: "Mathew Peter Rubino" },
  { full_name: "Antoine Lamont Smith", email: "smithantoine803@gmail.com", phone: "3253017815", role: "rookie", direct_manager: "James Jay Harjak" },
  { full_name: "Cayden Andrew Fleming", email: "caydenfleming1@gmail.com", phone: "4153104465", role: "manager", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "Jack Dawson Spiess", email: "jack.d.spiess@gmail.com", phone: "5135265765", role: "manager", direct_manager: "Mathew Peter Rubino" },
  { full_name: "Hewitt Brandon Mcbride", email: "hewitt13mcbride@gmail.com", phone: "3852070566", role: "manager", direct_manager: "Colton Joyce" },
  { full_name: "Dominic Jason Aponte", email: "dominicaponte5@gmail.com", phone: "5173202052", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Caleb John Saragina", email: "calebsaragina@gmail.com", phone: "7072940209", role: "rookie", direct_manager: "James Jay Harjak" },
  { full_name: "Kaseem Moore", email: "kymanimoore9@gmail.com", phone: "4705597267", role: "rookie", direct_manager: "Spencer John Yanbin Mamrick" },
  { full_name: "Ryder Jericho Johnson", email: "rjjtrap@gmail.com", phone: "3853236565", role: "manager", direct_manager: "Colton Joyce" },
  { full_name: "Jadon Micheal Aaron Flynn Fisher", email: "86fisherrang@gmail.com", phone: "7072367156", role: "rookie", direct_manager: "Mitchell Madison Ingram Bailey" },
  { full_name: "Jonah Arthur Sala Kaltenbach", email: "jkaltenbachbusiness@gmail.com", phone: "7077826383", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Drew Charles Dittus", email: "drewdittus1@gmail.com", phone: "2155707645", role: "rookie", direct_manager: "Troy Thomas Dela Vega" },
  { full_name: "Alexander Conescu", email: "alexanderconescu@gmail.com", phone: "5104074625", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Mason Lee Hess", email: "masonhess21@icloud.com", phone: "9253441885", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Devin Robert Stuffmann", email: "dstuffmann@gmail.com", phone: "9255281215", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Jacob Tyler Jones", email: "jacobjones6312@gmail.com", phone: "2522302848", role: "rookie", direct_manager: "Spencer John Yanbin Mamrick" },
  { full_name: "Mathew Peter Rubino", email: "matrubino2@gmail.com", phone: "2484179348", role: "manager", direct_manager: "Luc Robert Chevalier" },
  { full_name: "Seth Michael Dyer", email: "smdyer34@gmail.com", phone: "7073919750", role: "manager", direct_manager: "William James Gardner" },
  { full_name: "Ashton Tetmeyer", email: "ajtdb13@gmail.com", phone: "6028825985", role: "rookie", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "Campbell Aiden Gleaton", email: "cgthegoat11@gmail.com", phone: "8037476011", role: "rookie", direct_manager: "Spencer John Yanbin Mamrick" },
  { full_name: "Mason David Batt", email: "mason.batt9526@gmail.com", phone: "9253398609", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Johnathan Wesley Barr", email: "jbarr2094@gmail.com", phone: "4705211303", role: "rookie", direct_manager: "Spencer John Yanbin Mamrick" },
  { full_name: "Skyler Thomas Smith", email: "skylersmith2024@gmail.com", phone: "4706546826", role: "rookie", direct_manager: "Spencer John Yanbin Mamrick" },
  { full_name: "Barrett Layne Carrancho", email: "barrett.carrancho@gmail.com", phone: "7073638173", role: "rookie", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "Trevin Clayton Jensen Rose", email: "trevinutes10@gmail.com", phone: "8015034270", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Jessica Lynne Johnson", email: "jssicajhnson@gmail.com", phone: "8058619622", role: "manager", direct_manager: "Colton Joyce" },
  { full_name: "Lucas Ferreira Martins", email: "lucas.martins9991233@gmail.com", phone: "4154883741", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Cassius Witt Bradbury", email: "cassius.bury@gmail.com", phone: "7074948223", role: "rookie", direct_manager: "Justin Gordon Casarotti" },
  { full_name: "Spencer John Yanbin Mamrick", email: "spencermamrick288@gmail.com", phone: "8648077049", role: "manager", direct_manager: "Colton Joyce" },
  { full_name: "Daniel Kaenig", email: "yulby@protonmail.com", phone: "7077909189", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Brody Hunter Ruoff", email: "bruoff44@gmail.com", phone: "7077792334", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Cameron Thomas Rounds", email: "camrounds@gmail.com", phone: "7077877454", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Luc Robert Chevalier", email: "lucchevy24@gmail.com", phone: "5869445786", role: "manager", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "James Jay Harjak", email: "harjakjames0@gmail.com", phone: "3525663124", role: "rookie", direct_manager: "Colton Joyce" },
  { full_name: "Justin Gordon Casarotti", email: "justincasarotti@yahoo.com", phone: "7078028452", role: "manager", direct_manager: "William James Gardner" },
  { full_name: "Jesus Alvarez Alvarez", email: "jesus.alvarez8823@gmail.com", phone: "7072800215", role: "rookie", direct_manager: "Luc Robert Chevalier" },
  { full_name: "Joseph Thomas Grob", email: "josephgrob14@gmail.com", phone: "7077963452", role: "rookie", direct_manager: "Hunter Terry Shannon" },
  { full_name: "Gabriel Joseph Salvatore Brugellis", email: "gabrielbrugellis@gmail.com", phone: "8454670010", role: "rookie", direct_manager: "Sean Douglas Jablonski" },
  { full_name: "Mitchell Madison Ingram Bailey", email: "mitchellbailey858@gmail.com", phone: "7074772277", role: "rookie", direct_manager: "Luc Robert Chevalier" },
  { full_name: "William James Gardner", email: "william.gardner127@gmail.com", phone: "4155999730", role: "manager", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "Sean Douglas Jablonski", email: "seanjablonski@icloud.com", phone: "2489796807", role: "manager", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "Hunter Terry Shannon", email: "hunter_shannon1986@icloud.com", phone: "7077828199", role: "rookie", direct_manager: "Mathew Daniel Joyce" },
  { full_name: "Colton Joyce", email: "colt85jc@gmail.com", phone: "7077826695", role: "rookie", direct_manager: "Mathew Daniel Joyce" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: { success: string[]; failed: { email: string; error: string }[]; skipped: string[] } = {
      success: [],
      failed: [],
      skipped: [],
    };

    // Get existing users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingEmails = new Set(existingUsers?.users?.map(u => u.email?.toLowerCase()) || []);

    for (const userData of users) {
      try {
        // Skip if user already exists
        if (existingEmails.has(userData.email.toLowerCase())) {
          results.skipped.push(userData.email);
          continue;
        }

        // Create auth user
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          phone: `+1${userData.phone.replace(/\D/g, "")}`,
          password: "summit2026",
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            phone: userData.phone,
            direct_manager: userData.direct_manager,
            selected_role: userData.role,
          },
        });

        if (createError) {
          throw createError;
        }

        if (authUser?.user) {
          results.success.push(userData.email);
        }
      } catch (error) {
        results.failed.push({
          email: userData.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({
      message: `Created ${results.success.length} users, skipped ${results.skipped.length} existing, ${results.failed.length} failed`,
      ...results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Seed users error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
