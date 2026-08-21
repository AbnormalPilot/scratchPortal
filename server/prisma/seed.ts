import { PrismaClient, Role, EventStage, SubmissionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CHALLENGES_DATA = [
  {
    title: 'Sacrifices Must Be Made',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Every gain requires giving something up. Make tough choices to progress.',
    fullDescription: 'Maybe you have to delete a random item from your inventory every time you level up.',
    requirements: []
  },
  {
    title: 'Less is More',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Simplicity and scale create unexpected advantages and abilities.',
    fullDescription: 'The smaller your character gets, the faster they move and the higher they jump.',
    requirements: []
  },
  {
    title: 'You Only Get ONE',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Extreme limitation fuels inventive problem-solving.',
    fullDescription: 'You can have a single bullet that you must manually retrieve after every shot you fire.',
    requirements: []
  },
  {
    title: 'Everything Falls Apart',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'The world decays beneath you as time moves forward.',
    fullDescription: 'Your platforming blocks crumble into smaller pieces the longer you stand on them.',
    requirements: []
  },
  {
    title: 'Can’t Stop Moving',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Momentum is unstoppable and speed escalates with every action.',
    fullDescription: 'Your character can be a runaway train that speeds up every time you successfully dodge an obstacle.',
    requirements: []
  },
  {
    title: 'Every Action Has a Reaction',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Physics recoil and dual-purpose mechanics drive gameplay.',
    fullDescription: 'Firing your weapon may propels your character backward with massive recoil, turning shooting into your primary movement mechanic.',
    requirements: []
  },
  {
    title: 'Running on Borrowed Time',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Life and danger are inverted in a race against the ticking clock.',
    fullDescription: 'Your health bar can be an active countdown timer that only refills when you take damage from enemies or hazards.',
    requirements: []
  },
  {
    title: 'Trade Your Senses',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Temporarily enhance one ability at the cost of another. Make smart tactical trade-offs.',
    fullDescription: 'Maybe you can temporarily enhance one ability at the cost of another. Seeing farther might make you slower, jumping higher could reduce your attack power, or moving faster may limit your vision. Players must decide which trade-off helps them the most.',
    requirements: []
  },
  {
    title: 'Out of Sync',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Different parts of the world move at different speeds, forcing adaptive timing.',
    fullDescription: 'Maybe different parts of the world move at different speeds. Platforms, enemies, or obstacles could speed up or slow down independently, forcing players to constantly adapt their timing.',
    requirements: []
  },
  {
    title: 'Borrowed Abilities',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Borrow abilities from the world around you that disappear once you leave the zone.',
    fullDescription: "Maybe you can only use abilities you've borrowed from the world around you. Standing near certain objects, enemies, or zones grants special powers—but once you leave, those abilities disappear.",
    requirements: []
  },
  {
    title: 'One Button, Many Outcomes',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Every button press produces a different context-aware action depending on the situation.',
    fullDescription: 'Maybe every button press has a different effect depending on the situation. The same button could make you jump, attack, interact, or dash, encouraging creative and context-aware gameplay.',
    requirements: []
  },
  {
    title: 'Steal Their Power',
    category: 'Creative Theme',
    difficulty: 'Open Creative',
    maxCapacity: 4,
    shortDescription: 'Defeat enemies to steal their powers, holding only one stolen ability at a time.',
    fullDescription: 'Maybe defeating or interacting with an enemy lets you steal its unique ability, but only one power can be used at a time. Players must choose which ability is most useful for overcoming upcoming challenges.',
    requirements: []
  }
];

async function main() {
  console.log('[Seed] Seeding Scratch Game Hackathon Database...');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.round2Score.deleteMany();
  await prisma.round1Score.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.eventConfig.deleteMany();

  console.log('[Seed] Cleaned existing database tables.');

  // 2. Seed EventConfig
  const now = new Date();
  const eventConfig = await prisma.eventConfig.create({
    data: {
      currentStage: EventStage.REGISTRATION,
      r1StartTime: new Date(now.getTime() + 1000 * 60 * 30), // in 30 mins
      r1EndTime: new Date(now.getTime() + 1000 * 60 * (30 + 240)), // 4 hours later
      r2StartTime: new Date(now.getTime() + 1000 * 60 * (30 + 240 + 60)), // 1h judging later
      r2EndTime: new Date(now.getTime() + 1000 * 60 * (30 + 240 + 60 + 120)), // 2h later
      isLeaderboardPublished: false
    }
  });
  console.log(`[Seed] EventConfig initialized (Current Stage: ${eventConfig.currentStage})`);

  // 3. Seed 12 Scratch Challenges
  console.log('[Seed] Seeding 12 Scratch Problem Statements...');
  const createdChallenges = [];
  for (const c of CHALLENGES_DATA) {
    const challenge = await prisma.challenge.create({
      data: {
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        maxCapacity: c.maxCapacity,
        claimedCount: 0,
        shortDescription: c.shortDescription,
        fullDescription: c.fullDescription,
        requirements: c.requirements
      }
    });
    createdChallenges.push(challenge);
  }
  console.log(`[Seed] Seeded ${createdChallenges.length} Problem Statements.`);

  // 4. Seed Admin & Judges
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const judgePasswordHash = await bcrypt.hash('judge123', 10);
  const participantPasswordHash = await bcrypt.hash('team123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hackathon.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Chief Organizer (Admin)',
      role: Role.ORGANIZER
    }
  });

  const judge1 = await prisma.user.create({
    data: {
      email: 'judge1@hackathon.com',
      passwordHash: judgePasswordHash,
      fullName: 'Dr. Alan Turing (Judge 1)',
      role: Role.JUDGE
    }
  });

  const judge2 = await prisma.user.create({
    data: {
      email: 'judge2@hackathon.com',
      passwordHash: judgePasswordHash,
      fullName: 'Prof. Ada Lovelace (Judge 2)',
      role: Role.JUDGE
    }
  });

  console.log(`[Seed] Seeded 1 Organizer and 2 Judges.`);

  // 5. Seed 76 Real Teams with Full Member Rosters from CSV
  const realTeamsCsv = `id,password,team_name,leader_name,leader_email,leader_phone,member2_name,member2_email,member3_name,member3_email
TEAM45,E26AM45#11,Team Apex,Vaishnavi,e26b07f0699@adypu.edu.in,8218358445,Khushvindar Singh,e26b07f0568@adypu.edu.in,Shyamli Bakale,e26b07f0813@adypu.edu.in
CHIP24,E26IP24#11,Chipkali,Takshita,e26b07f0582@adypu.edu.in,9974830924,Lavish,e26b07f0747@adypu.edu.in,Rashi,e26b07f0598@adypu.edu.in
CODE18,ABYDE18#11,Code_nt_found,Abyakta Prakash Pradhan,abyakta2023@gmail.com,7853852118,Biplab Kumar Dhali,dhb75105@gmail.com,Prasad Kalgunde,kalgundeprasad0802@gmail.com
SKYR76,ADIYR76#13,Skyrim,Aditya Jinu,aditya.jinu11@gmail.com,7869061976,Aksh Patidar,akshpatidar2007@gmail.com,Aryansh Verma,aryanshverma1508@gmail.com
DWAR12,DIXAR12#12,Dwarfs,Aman Dixit,dixitaman117@gmail.com,9322052312,Swanand Nilesh Kadam,swanandkadam8061@gmail.com,Nishant Ekka,nishantekka2007@gmail.com
APEX44,CHIEX44#14,Apex legends,Chinmay Jangid,chinmayj302009@gmail.com,7073599744,Ruhan jangir,ruhanjangir9@gmail.com,Vicky Chaudhary,vickeychaudhary855@gmail.com
SAAS75,ATHAS75#16,Saas,Atharav balotra,atharavbalotra83@gmail.com,8968573775,Archita pandey,architaa08@gmail.com,Shatakshi gupta,shatakshi.g.13@gmail.com
BLUE00,HEEUE00#11,Blue10.1,Heet Mehta,heetmehta16@gmail.com,9322559300,Parv Shah,parvshah8002@gmail.com,Akshat Singh,akshatsinghbishen7777@gmail.com
3IDI87,MANDI87#9,3 Idiots,Smit Mane,manesmit8@gmail.com,8956891187,Sangharsh sawant,sangharshsawant3331@gmail.com,Dhanraj Singh,dhanrajsingh4607@gmail.com
FIRE20,E26RE20#11,Fire extinguishers,Piyush kori,e26b07f0801@adypu.edu.in,7067164320,Soham shankar deshmane,sohamd1033@gmail.com,Harshit Singh,e26b07f0548@adypu.edu.in
LACA08,ABHCA08#16,La Casa de Papel,Abhikalp Sisodiya,abhikalp2006dhar@gmail.com,6232483608,Aarush Anand Karva,aarushkarva@gmail.com,Unmesh Bipin Bhagat,unmesh9073@gmail.com
SCRA88,RISRA88#15,Scratchables,Rishabh Sundrani,rishabhsundrani@gmail.com,9131213588,Kusumesh Talokar,tkusumesh@gmail.com,Ananya Singh,ananysin0111@gmail.com
TEAM57,AHMAM57#15,Team LUCID,Ahmad Mohsin,ahmadmohsin0765@gmail.com,7991479557,Tanishka,trishatanishka4@gmail.com,Annanya Gautam,annanyag07@gmail.com
HIGH99,DHRGH99#15,Highkey,Dhruv Kashiv,dhruvkashiv2401@gmail.com,7987323699,Shubh Srivastava,shubhrelm@gmail.com,Parishi Maheshwari,parishimaheshwari2108@gmail.com
PIXE10,NITXE10#14,Pixel pirates,Nitish singla,nitishsingllla@gmil.com,7340803110,Anuradha gaur,anuradhagaur1408@gmail.com,Janika,jainika32561@gmail.com
CODE35,SNEDE35#11,Code Catalyst,Sneha Singh,sneha2208sh@gmail.com,8735850635,Paulami Bhosale,paulamibhosle@gmail.com,Rhea Sharma,srheark99@gmail.com
TECH84,VAICH84#16,Tech Brains,Vaikunth Ankola,vaikunthankola23@gmail.com,9274322084,Nandini Sanghani,sanghaninandini7@gmail.com,Ayaz Mazrun,mazrunayaz4@gmail.com
TRIO17,DARIO17#15,triopoly,Darshil Gunjal,darshilgunjal23@gmail.com,8668702217,kumar dipankar sahoo,sahookumar657@gmail.com,NA,xyz@gmail.com
PLAY09,E26AY09#11,Playforge,Rupali Verma,e26b07f0691@adypu.edu.in,9981672509,Shivanshi,e26b07f0695@adypu.edu.in,Tanish Chalke,e26b07f0793@adypu.edu.in
POKE23,E26KE23#11,Pokemon Trainers,Vaibhav Tripathi,e26b07f0552@adypu.edu.in,7398581723,Krish Tomar,e26b07f0847@adypu.edu.in,Mohammad Ahad Khan,e26b07f0844@adypu.edu.in
ALLI81,MUKLI81#14,Allied,Mukul Kumar,mukul.kumar10k@gmail.com,9910540081,Ishmit Omar,ishmitomar3212@gmail.com,Mahendi raza,mahdirazabhojani41@gmail.com
BYTE08,E26TE08#11,Byteforge,Anubhav kumar rai,e26b07f0843@adypu.edu.in,9996652008,Utkarsh,e26b07f0710@adypu.edu.in,Dhairya tiwari,e26b07f1062@adypu.edu.in
SYNT93,OM3NT93#7,Syntax Override,Om Vashisht,om3725h@gmail.com,8930867593,Gitesh Patil,giteshkate23@gmail.com,Vansh,savitakataria763@gmail.com
3THR21,MOHHR21#17,3 Thrives,Aryan Singh,mohitsharma082020@gmail.com,9930209621,Aryan Singh,aryanaryansingh306@gmail.com,Priyanshu Patel,whypriyansshu@gmail.com
AKAT25,E26AT25#11,Akatsuki,Rijuta Kundu,e26b07f1063@adypu.edu.in,8291700925,D Tarun,tarund.0651@gmail.com,md sohail,mohammedsohail0301@gmail.com
CRAC41,VISAC41#13,Crackheads,Vishwa Solanki,vissolanki121@gmail.com,9574501741,Prisha Pandya,pandyaprisha0@gmail.com,Sharon Robinson,sharon05012008@gmail.com
BYTE47,VEDTE47#9,BYTEBLAZE,Ved Kalpeshkumar Lad,vedklad12@gmail.com,9408912047,Bishnoi Devendra Laduram,bishnoidevendra299@gmail.com,Tanishq Yogeshkumar Patel,tanishqpatel205@gmail.com
NOVE78,E26VE78#11,noverification,Ali Raza,e26b07f0644@adypu.edu.in,7607462978,Tanmay Choudhary,e26b07f0684@adypu.edu.in,Honey Kumar,e26b07f0717@adypu.edu.in
TEAM04,CHAAM04#20,Team Adam,Sarthak Chaudhary,chaudharysarthak1179@gmail.com,7016621904,Vaibhav Mehta,mehtavaibhav.lakshya@gmail.com,Jash tolwani,jashutolwani245@gmail.com
ZAND77,KURND77#14,Zandril,Nishant Avinash Kurkure,kurkurenishant@gmail.com,9373773677,Raj manoj patil,rjrajsonawane2006@gmail.com,Rohit Kshirsagar,rohitkshirsagar431@gmail.com
CATA37,PRITA37#16,Catalysts,Priya Hisariya,priyahisariya494@gmail.com,9142591337,Shreya Sinha,shreyasinha384@gmail.com,Divyam Vyas,divyamvyas4@gmail.com
ASTR12,ADITR12#22,Astreya,Aditi shrama,aditisaisharmaofficial@gmail.com,8077980212,Shreya Sahi,shreyasahi1308@gmail.com,Yusuf Tarwala,yusuftarwala8752@gmail.com
INNO01,AVINO01#14,InnovateX,Mr Avinash Kurkure,avinashkurkure@gmail.com,9209889301,Pruthviraj Gojare,pruthvirajgojare@gmail.com,Chaitanya Salunke,salunkechaitanya006@gmail.com
TRID50,CHEID50#15,Trident,Chetas Patel,chetaspatel2008@gmail.com,7610469950,Unnati Gupta,unnugupta160@gmail.com,Hardik Aggarwal,aggarwalh724@gmail.com
BYTE04,DHRTE04#16,Byte,Dhruv Makhija,dhruvmakhija2006@gmail.com,7696200104,Priyanshi Bhati,priyanshibhati81@gmail.com,Surya,suryapaladugu25@gmail.com
FIVE50,NAMVE50#13,Five Clover,Naman Lunia,namanlunia229@gmail.com,9833688850,Raja Shirjeel,shirjeeldevlops@gmail.com,Arishk Singh,arishk2006@gmail.com
CODE72,UJJDE72#15,CODEX,UJJWAL GUPTA,ujjwalgupta2160@gmail.com,8604220372,SHAKTI KUMAR SINGH,shaktikumarsingh19300@gmail.com,DIBENDU GHOSH,ankitghosh1983@gmail.com
ZERO14,SANRO14#16,ZeroLatency,Sankalp Pandey,sankalppandey.56@gmail.com,7905817014,Aditya Kumar,adityakumar33307@gmail.com,Dipanshu Singh,diipuphone@gmail.com
HIT_15,NIKT_15#12,HIT_BOX,nikunj chapte,nikunjchapte@gmail.com,8451001715,Nikhil Kolhe,nikhilkolhe7809@gmail.com,Ayush gupta,aayush9329@gmail.com
ALPH19,SANPH19#16,Alpha,Sandeep Verma,sandeepjiverma11@gmail.com,9918492619,Nevil Maru,mr.maru009@gmail.com,Raghav Motwani,motwaniraghav925@gmail.com
TEAM67,MANAM67#14,Team Building Blocks,Mannat  telvani,mannattehlani5@gmail.com,8103305567,Ankit Kumar,ankitt143kumarr@gmail.com,Divya Prakash,surajthakur8987@gmail.com
TEAM47,SAMAM47#13,Team 202,Samrudha Vishal Borse,samrudhaborse@gmail.com,9359174647,Nilesh Patel,nil80000esh@gmail.com,Rohit Maheshbhai Joshi,rohitjoshi28102008@gmail.com
SSB59,CHASB59#14,SSB,Alok Chauhan,chauhanalok546@gmail.com,6399136559,Prince Bhamla,bhamlaprince05@gmail.com,Mayank Sharma,mayanksharma8085ms@gmail.com
404N79,WAN4N79#15,404 not founders,Soham Wankhade,wankhadesoham65@gmail.com,7249168479,Parth mohindroo,sumanmohindroo707@gmail.com,Om upadhyay,omupadhyay0007@gmail.com
PAYP01,MAUYP01#13,Payphone,Aviral Maurya,mauryaaviral5@gmail.com,9958483801,Ajay Gurjar,ajaygurjar7227@gmail.com,Eknaath Sunil Bawane,eknaathbawane14@gmail.com
3THR21,MOHHR21#18,3 Thrive,Mohit Sharma,mohit.sharma993020@gmail.com,9930209621,Aryan Singh,singhmamtaprathviraj1978@gmail.com,Priyanshu Patel,priiyaansshuu@gmail.com
JHMS04,JIVMS04#9,JHM Storm,Jivika Sharma,jivikadpr@gmail.com,9058410304,Mudit Kumawat,muditkumawat21@gmail.com,Harsh kumar Dhankar,dhankarharshkumar1@gmail.com
RUNT35,RIYNT35#11,Runtime Rebels,Riya Agrawal,riya1503235@gmail.com,8440076235,Jinal Patidar,jinalraopatidar@gmail.com,Pranav Kumar,homepranavall@gmail.com
BINA36,MOKNA36#15,Binary Brains,Mokshini Singh,mokshinisingh8b@gmail.com,8949660136,Sarvesh Chawan,sarvesh.chawan1000@gmail.com,Tushar,tushar153588@gmail.com
CLIC52,PATIC52#14,Click & conquer,SHYAM PATEL,patelshyam2008@gmail.com,9213449152,Deep sabhadiya,deepsabhadiya01@gmail.com,Harvender Singh rawat,harvendersinghrawat7336@gmail.com
CHAO52,73AAO52#15,Chaotic Dreamers,Aayuah Bhaskar,73aayushbhaskar@gmail.com,7004994052,Bhavya M Sheth,shethbhavyam211@gmail.com,Yojith Thati,yojith551@gmail.com
TRIP04,MAHIP04#12,Triple Threat,Maharshi Patel,maharshi1704@gmail.com,9998751704,Shashank Suyash Yadav,e26b07f0738@adypu.edu.in,Muskan Sharma,e26b07f0711@adypu.edu.in
QUAS87,SHAAS87#16,Quasar,Sharwari Ghodase,sharwari.ghodase@gmail.com,9156920587,Aniket,aniketmanna03@gmail.com,Nipun,brainpool25@gmail.com
NOVA06,SAPVA06#14,Nova,Sapna,sapna.16072023@gmail.com,9699645206,Janhavi,janvipsha2008@gmail.com,Aanya Ahuja,aanyaahuja002@gmail.com
CHAO64,SG7AO64#9,CHAOS SYNDICATE,Ayush Kumar Jha,sg7772904@gmail.com,9835018764,Ashish Parihar,ashishparihar138@gmail.com,Anika Sharma,anika19112007@gmail.com
NOID22,KAVID22#18,No Idea,Kavyansh Kushwaha,kavyanshkushwaha78@gmail.com,7497970522,Arham,my1555552@gmail.com,ABHINANDAN RATHORE,abhinandan.verse@gmail.com
PYAR77,BHAAR77#14,Pyaraaloo,Taran Bhavsar,bhavsartaran04@gmail.com,9998249677,Abhinav Kumar Jha,jharishu402@gmail.com,SANSKAR SONI,sanskarsoni531@gmail.com
APEX09,TGMEX09#12,Apex,Rohit Kumar Rai,tgmrohit9087@gmail.com,8083473609,Krishna girdhar Agarwal,krishisahacker0209@gmail.com,Preet Madhavi,preetmadhavi02@gmail.com
CODE20,PRODE20#15,Code Crew,Shreyas Verma,progamer.200719@gmail.com,9039523320,Aniruddha Ravindranath Bongale,aniruddhabongale@gmail.com,Mohammad Kothi,mohammadkothi012@gamil.com
ELON15,TUBON15#9,Elon musk,Swapnesh swaroop Mohanty,tuberu541@gmail.com,9040802115,Suraj kumar,kumarsuraj161616@gmail.com,Alok Gupta,alokcbn@gmail.com
TEAM05,ARYAM05#11,TEAM ENTITY,Arya prajapati,aryamaitri9@gmail.com,9213568005,prabal pratap singh sikarwar,prabalsikarwar73@gmail.com,Joel Biju,rqf.odyssey@gmail.com
TVA72,DEEVA72#11,TVA,Deev Jethwa,deev.jethwa@gmail.com,9724130672,Agam Makhija,agam.makhija07@gmail.com,Bhavika,luvv2627@gmail.com
BLOC15,APUOC15#15,Blockheads,Apurav Agarwal,apuravagarwal19@gmail.com,8051975915,Bhumika Israni,bhumikaisrani198@gmail.com,Ayush Kumar Sinha,ayushsinhajsg2007@gmail.com
SNAT40,GIRAT40#14,Snatchers,Girish Sharma,girisstud42406@gmail.com,9783625140,Pritpal Singh,pritpal0184@gmail.com,Parag Rajeshkumar Sanghavi,paragsanghavi.101@gmail.com
INFI67,ABHFI67#18,infitude,Abhishek kumar,abhishekkumar88462@gmail.com,7761044467,Mayank Vikram Sahasrabudhe,mayanksbudhe@gmail.com,Kaashika Tomar,e26b07f0878@adypu.edu.in
NOVA72,SAHVA72#15,NovaForge,Sahil,sahilsaini74042@gmail.com,8708552672,VEER PRATAP SINGH,veer230022@gmail.com,Pushkar jaiswal,jpushkar237@gmail.com
TITA11,MAGTA11#15,Titans,kumkum magnani,magnanikumkum07@gmail.com,9104677011,Aayush,aayushhemraj@gmail.com,Chetanya,chetanyagulia05@gmail.com
PLAT22,VEDAT22#14,Platformers,Vedika Yadav,vedikayadav315@gmail.com,6265147122,Vedant kakde,vedantkakde028@gmail.com,Mohammad Adnan,mr.holmes5562@gmail.com
ARYA43,ARYYA43#16,arya,Aryan Raj,aryanraj18112009@gmail.com,6207913843,Maharshi Patel,maharshi172008@gmail.com,Sumit kavishwar,kavishwarsumit39@gmail.com
TEAM46,SATAM46#14,TEAM ELITE,Satyam Singh,satyam23102007@gmail.com,7607375846,Atharv M. Nande,amnande47@gmail.com,Rudra Tiwari,lavkusht436@gmail.com
THEI71,E26EI71#11,The Invincibles,Tanmaya Verma,e26b07f0886@adypu.edu.in,7657857071,Sangam Pal,sangampal2019@gmail.com,Sanskar Kesharwani,sanskarkesharwani140@gmail.com
KAVE76,KAVVE76#14,kaveri,kaveri singh,kaverisingh812@gmail.com,9873351576,Aditya soni,adityasoni98178@gmail.com,Arnav Kishor Yeole,yeole.aenav34@gmail.com
ISHA77,JANHA77#12,Ishan janwa,Ishan janwa,janwaishan35@gmail.com,7568936177,Tanmay Gahlot,tanmaygahlott@gmail.com,Sameer Newar,sameernewar7841@gmail.com
SARA54,E26RA54#11,Sara,Sara Kottawar,e26b07f0709@adypu.edu.in,7498310054,Harshit Jha,harshit.rn.jha1234@gmail.com,Ayesha Siddiqua,ayeshasiddiqua.2459@gmail.com
VORT78,E26RT78#11,Vortex,Prashant Kumar,e26b07f0799@adypu.edu.in,8055183878,Nitesh Kumar,niteshkumar03961@gmail.com,Raja Shirjeel,rajasarjais@gmail.com
HACK47,GVTCK47#8,Hacker Janata Party,Md Arman,gvtd6485@gmail.com,9508656947,Aaditya Deshmukh-Patil,aadityaudp19@gmail.com,,`;

  const lines = realTeamsCsv.trim().split('\n').slice(1);
  const usedAccessCodes = new Set<string>();
  const usedEmails = new Set<string>();
  const usedNames = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const [idRaw, passRaw, teamNameRaw, leaderNameRaw, emailRaw, _phoneRaw, m2NameRaw, m2EmailRaw, m3NameRaw, m3EmailRaw] = line.split(',');

    const teamName = teamNameRaw.trim();
    const leaderName = leaderNameRaw.trim();
    const leaderEmail = emailRaw.trim().toLowerCase();
    const rawPass = passRaw.trim();
    let accessCode = idRaw.trim().toUpperCase();

    if (usedAccessCodes.has(accessCode)) {
      let candidate = `${accessCode}_2`;
      let counter = 2;
      while (usedAccessCodes.has(candidate)) {
        counter++;
        candidate = `${accessCode}_${counter}`;
      }
      accessCode = candidate;
    }
    usedAccessCodes.add(accessCode);

    let finalTeamName = teamName;
    if (usedNames.has(finalTeamName.toLowerCase())) {
      finalTeamName = `${teamName} (2)`;
    }
    usedNames.add(finalTeamName.toLowerCase());

    const passwordHash = await bcrypt.hash(rawPass, 10);

    const team = await prisma.team.create({
      data: {
        name: finalTeamName,
        accessCode: accessCode,
      }
    });

    const insertMember = async (nameRaw: string, emailRaw: string, isLeader: boolean) => {
      if (!nameRaw || !emailRaw) return;
      const name = nameRaw.trim();
      const email = emailRaw.trim().toLowerCase();
      if (!name || name === 'NA' || !email || email === 'xyz@gmail.com') return;

      let finalEmail = email;
      if (usedEmails.has(finalEmail)) {
        finalEmail = `${finalEmail.split('@')[0]}+${team.id.slice(0, 4)}@${finalEmail.split('@')[1]}`;
      }
      usedEmails.add(finalEmail);

      await prisma.user.create({
        data: {
          fullName: name,
          email: finalEmail,
          passwordHash: passwordHash,
          role: Role.PARTICIPANT,
          isTeamLeader: isLeader,
          teamId: team.id
        }
      });
    };

    await insertMember(leaderName, leaderEmail, true);
    if (m2NameRaw && m2EmailRaw) await insertMember(m2NameRaw, m2EmailRaw, false);
    if (m3NameRaw && m3EmailRaw) await insertMember(m3NameRaw, m3EmailRaw, false);
  }

  console.log(`[Seed] Seeded ${lines.length} real teams and complete member rosters from CSV.`);

  // 6. Seed initial audit log
  await prisma.auditLog.create({
    data: {
      eventType: 'SYSTEM_INITIALIZED',
      userId: admin.id,
      metadata: {
        challengesCount: createdChallenges.length,
        initialStage: EventStage.REGISTRATION
      }
    }
  });

  console.log('[Seed] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
