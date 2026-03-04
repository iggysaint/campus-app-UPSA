import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ScheduleData {
  university: string;
  academic_year: string;
  semester: string;
  level: number;
  schedule: ScheduleEntry[];
}

interface ScheduleEntry {
  day: string;
  time_slot: string;
  classes: ClassEntry[];
}

interface ClassEntry {
  venue: string;
  course_code: string;
  course_name: string;
  lecturer: string;
  programme: string;
}

const scheduleData: ScheduleData = {
  "university": "University of Professional Studies, Accra",
  "academic_year": "2025/2026",
  "semester": "Second Semester",
  "level": 400,
  "schedule": [
    {
      "day": "Monday",
      "time_slot": "7:30AM - 10:30AM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT402", "course_name": "Corporate Reporting II", "lecturer": "Christian Mensah", "programme": "ACT1" },
        { "venue": "PCU 2", "course_code": "BACT402", "course_name": "Supply Chain Management", "lecturer": "Dr. Linus Kudos", "programme": "ADM1" },
        { "venue": "PCU 3", "course_code": "BBBA404", "course_name": "Total Quality Management", "lecturer": "Peter Kodjie", "programme": "ADM4" },
        { "venue": "PCU 4", "course_code": "BACT406", "course_name": "Public Sector Accounting & Finance", "lecturer": "Salomey Addo", "programme": "AF1" },
        { "venue": "LBC402A", "course_code": "BBEC402", "course_name": "Advanced Macroeconomics", "lecturer": "Mr. Emmanuel Lawluvi", "programme": "BE" },
        { "venue": "PCU 5", "course_code": "PBPR404", "course_name": "Speech Writing", "lecturer": "Ivy Jones-Mensah", "programme": "PR1" },
        { "venue": "PCU 6", "course_code": "BITM402", "course_name": "Professional Computing Practise", "lecturer": "Dr. Nurudeen Mohammed", "programme": "IT" }
      ]
    },
    {
      "day": "Monday",
      "time_slot": "11:00AM - 2:00PM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT406", "course_name": "Public Sector Accounting & Finance", "lecturer": "Salomey Addo", "programme": "ACT1" },
        { "venue": "PCU 2", "course_code": "BBBA404", "course_name": "Total Quality Management", "lecturer": "Peter Kodjie", "programme": "ADM1" },
        { "venue": "PCU 3", "course_code": "BACT402", "course_name": "Supply Chain Management", "lecturer": "Dr. Linus Kudos", "programme": "ADM4" },
        { "venue": "PCU 4", "course_code": "BACT402", "course_name": "Corporate Reporting II", "lecturer": "Christian Mensah", "programme": "AF1" },
        { "venue": "AB 2", "course_code": "BASC402", "course_name": "Pension Planning & Administration", "lecturer": "Dr. Andrew Agblobi", "programme": "AS" },
        { "venue": "LBC402A", "course_code": "BBEC406", "course_name": "Financial Economics", "lecturer": "Michael Minlah", "programme": "BE" },
        { "venue": "PCU 5", "course_code": "PBPR402", "course_name": "Public Relations Strategy & Campaign Planning", "lecturer": "Richard Quarshigah", "programme": "PR1" },
        { "venue": "PCU 6", "course_code": "PBPR404", "course_name": "Speech Writing", "lecturer": "Ivy Jones-Mensah", "programme": "PR2" }
      ]
    },
    {
      "day": "Monday",
      "time_slot": "2:15PM - 5:15PM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT402", "course_name": "Corporate Reporting II", "lecturer": "Dr. Philomena Acquah", "programme": "ACT2" },
        { "venue": "PCU 4", "course_code": "BBBA404", "course_name": "Total Quality Management", "lecturer": "Dr. Leeford Ameyibor", "programme": "ADM2/RE" },
        { "venue": "PCU 2", "course_code": "BBBA402", "course_name": "International Human Resource Management", "lecturer": "Dr. Rejoice Esi Asante", "programme": "ADM5" },
        { "venue": "PCU 3", "course_code": "BACT406", "course_name": "Public Sector Accounting & Finance", "lecturer": "Salomey Addo", "programme": "AF2" },
        { "venue": "PCU 6", "course_code": "BITM404", "course_name": "Information Management", "lecturer": "D. Aboagye-Darko", "programme": "IT" },
        { "venue": "LBC402A", "course_code": "BASC402", "course_name": "Pension Fund Management", "lecturer": "Dr. Andrew Agblobi", "programme": "AS" },
        { "venue": "PCU 5", "course_code": "BASC402", "course_name": "Public Relations Strategy & Campaign Planning", "lecturer": "Mr. Richard Quarshigah", "programme": "PR2" }
      ]
    },
    {
      "day": "Tuesday",
      "time_slot": "7:30AM - 10:30AM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT406", "course_name": "Public Sector Accounting & Finance", "lecturer": "Salomey Addo", "programme": "ACT2" },
        { "venue": "PCU 2", "course_code": "BBBA406", "course_name": "Supply Chain Management", "lecturer": "Dr. Linus Kudu", "programme": "ADM2" },
        { "venue": "PCU 3", "course_code": "BBBA404", "course_name": "Total Quality Management", "lecturer": "Peter Kodjie", "programme": "ADM5" },
        { "venue": "PCU 4", "course_code": "BACT408", "course_name": "Performance Management", "lecturer": "Mr. Emmanuel Nketiah", "programme": "AF2" },
        { "venue": "LBC402A", "course_code": "BASC404", "course_name": "Actuarial Professional Practice", "lecturer": "Dr. Kofi Nyamekye", "programme": "AS" },
        { "venue": "PCU 5", "course_code": "BITM408", "course_name": "Software Quality Management", "lecturer": "Mr. Godwin Ntow Danso", "programme": "IT" },
        { "venue": "PCU 6", "course_code": "BMKT402", "course_name": "Retail Management", "lecturer": "Akwasi Sarfo Kantanka", "programme": "MKT" }
      ]
    },
    {
      "day": "Tuesday",
      "time_slot": "11:00AM - 2:00PM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT408", "course_name": "Performance Management", "lecturer": "Mr. Emmanuel Nketiah", "programme": "ACT2" },
        { "venue": "PCU 2", "course_code": "BBBA402", "course_name": "International Human Resource Management", "lecturer": "Marco Mensah", "programme": "ADM2" },
        { "venue": "PCU 3", "course_code": "BBBA406", "course_name": "Supply Chain Management", "lecturer": "Dr. Agnes A. Anima", "programme": "ADM5" },
        { "venue": "PCU 4", "course_code": "BBBA412", "course_name": "E-Commerce", "lecturer": "Mrs. Ivonne Nketiah", "programme": "ADM3&6" },
        { "venue": "PCU 5", "course_code": "BBAF404", "course_name": "Money and Capital Markets", "lecturer": "Dr. Josephine Mensah-Ababio", "programme": "AF2" },
        { "venue": "YAB4B", "course_code": "BBAF422", "course_name": "Microfinance Management", "lecturer": "Dr. Godwin Musah", "programme": "BF" },
        { "venue": "LBC402A", "course_code": "BASC408", "course_name": "Health Insurance", "lecturer": "Ms. Ishan Mohammed", "programme": "AS" },
        { "venue": "PCU 6", "course_code": "PBPR402", "course_name": "Public Relations Strategy & Campaign Planning", "lecturer": "Dr. Martin Segtub", "programme": "PR3" },
        { "venue": "YAB5B", "course_code": "BMKT404", "course_name": "Tourism Marketing", "lecturer": "Prof. Alex Preko", "programme": "MKT" },
        { "venue": "LBC102A", "course_code": "BRMF402", "course_name": "Real Estate Marketing & Brokerage", "lecturer": "Dr. Kailan Abdulhamid", "programme": "RE" }
      ]
    },
    {
      "day": "Tuesday",
      "time_slot": "2:15PM - 5:15PM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT402", "course_name": "Corporate Reporting II", "lecturer": "Dr. Philomena Acquah", "programme": "ACT3" },
        { "venue": "PCU 2", "course_code": "BBBA404", "course_name": "Total Quality Management", "lecturer": "Dr. Leeford Ameyibor", "programme": "ADM3" },
        { "venue": "PCU 3", "course_code": "BBBA404", "course_name": "Total Quality Management", "lecturer": "Dr. Leeford Ameyibor", "programme": "ADM6" },
        { "venue": "PCU 4", "course_code": "BBAF404", "course_name": "Money and Capital Markets", "lecturer": "Dr. Josephine Mensah-Ababio", "programme": "AF3" },
        { "venue": "LBC402A", "course_code": "BRMF404", "course_name": "Principles of Valuation II", "lecturer": "Dr. Stanislaus Adiaba", "programme": "RE" },
        { "venue": "PCU 5", "course_code": "BBAF402", "course_name": "International Trade Finance", "lecturer": "Dr. Abubakar Musah", "programme": "BF" },
        { "venue": "GH 7", "course_code": "BITM412", "course_name": "Mobile Web Development", "lecturer": "Dr. Dickson Wornyo", "programme": "IT" }
      ]
    },
    {
      "day": "Wednesday",
      "time_slot": "7:30AM - 10:30AM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT406", "course_name": "Public Sector Accounting and Finance", "lecturer": "Mr. Desmond Aboagye", "programme": "ACT3" },
        { "venue": "PCU 2", "course_code": "BBBA406", "course_name": "Supply Chain Management", "lecturer": "Dr. Agnes A. Anima", "programme": "ADM3" },
        { "venue": "PCU 3", "course_code": "BBBA402", "course_name": "International Human Resource Management", "lecturer": "Ms. Hannah Acquah", "programme": "ADM6" },
        { "venue": "PCU 4", "course_code": "BACT408", "course_name": "Performance Management", "lecturer": "Mr. Emmanuel Nketiah", "programme": "AF3" },
        { "venue": "LBC102A", "course_code": "BRMF406", "course_name": "Real Estate Finance and Investment II", "lecturer": "Dr. Andrew Agblobi", "programme": "RE" },
        { "venue": "PCU 5", "course_code": "BBAF408", "course_name": "Bank Management", "lecturer": "Dr. Lawrence Asare Boadi", "programme": "BF" }
      ]
    },
    {
      "day": "Wednesday",
      "time_slot": "11:00AM - 2:00PM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BACT408", "course_name": "Performance Management", "lecturer": "Dr. Emmanuel Debrah", "programme": "ACT3" },
        { "venue": "PCU 2", "course_code": "BBBA402", "course_name": "International Human Resource Management", "lecturer": "Ms. Hannah Acquah", "programme": "ADM3" },
        { "venue": "PCU 3", "course_code": "BBBA406", "course_name": "Supply Chain Management", "lecturer": "Dr. Stephen Antwi", "programme": "ADM6" },
        { "venue": "LBC402A", "course_code": "BBEC404", "course_name": "Game Theory and Business Applications", "lecturer": "Dr. Kwaku Amakye", "programme": "BE" },
        { "venue": "PCU 3", "course_code": "BBAF412", "course_name": "Business Analysis and Financial Policy", "lecturer": "Mr. Kwame Fosu Boateng", "programme": "BF" }
      ]
    },
    {
      "day": "Wednesday",
      "time_slot": "2:15PM - 5:15PM",
      "classes": [
        { "venue": "PCU 4", "course_code": "BBBA412", "course_name": "Advance E-Commerce", "lecturer": "Mr. Adnan Lamptey", "programme": "ADM1&4" },
        { "venue": "PCU 5", "course_code": "BACT406", "course_name": "Public Sector Accounting and Finance", "lecturer": "Mr. Desmond Aboagye", "programme": "AF3" },
        { "venue": "PCU 6", "course_code": "BITM406", "course_name": "Computer & Network Security", "lecturer": "Dr. Selasi Ocansey", "programme": "IT" },
        { "venue": "LBC102A", "course_code": "BBAF406", "course_name": "Public Finance", "lecturer": "Dr. Christopher Quaidoo", "programme": "BE" },
        { "venue": "YAB4B", "course_code": "PBPR404", "course_name": "Speech Writing", "lecturer": "Prof. Adwoa Amankwaah", "programme": "PR3" }
      ]
    },
    {
      "day": "Thursday",
      "time_slot": "7:30AM - 10:30AM",
      "classes": [
        { "venue": "YAB1", "course_code": "BACT408", "course_name": "Performance Management", "lecturer": "Dr. Emmanuel Debrah", "programme": "ACT1" },
        { "venue": "YAB2A", "course_code": "BBBA402", "course_name": "International Human Resource Management", "lecturer": "Marco Mensah", "programme": "ADM1" },
        { "venue": "YAB2B", "course_code": "BBAF404", "course_name": "Money and Capital Markets", "lecturer": "Dr. Nuhu Abduraman", "programme": "AF1" },
        { "venue": "LBC402A", "course_code": "BBEC406", "course_name": "Labour Economics II", "lecturer": "Mr. Alpha Ayine", "programme": "BE" }
      ]
    },
    {
      "day": "Thursday",
      "time_slot": "11:00AM - 2:00PM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BBBA402", "course_name": "International Human Resource Management", "lecturer": "Marco Mensah", "programme": "ADM4" },
        { "venue": "PCU 2", "course_code": "BBBA412", "course_name": "Advance E-Commerce", "lecturer": "Mr. Adnan Lamptey", "programme": "ADM2&5" },
        { "venue": "PCU 3", "course_code": "BACT408", "course_name": "Performance Management", "lecturer": "Dr. Emmanuel Debrah", "programme": "AF1" },
        { "venue": "PCU 4", "course_code": "BACT402", "course_name": "Corporate Reporting II", "lecturer": "Dr. Philomena Acquah", "programme": "AF3" },
        { "venue": "LBC102A", "course_code": "BBAF416", "course_name": "Money, Banking & Financial Markets", "lecturer": "Dr. Philomena Dadzie", "programme": "AS" },
        { "venue": "LBC202A", "course_code": "BBEC406", "course_name": "Energy Economics II", "lecturer": "Alpha Ayine", "programme": "BE" }
      ]
    },
    {
      "day": "Thursday",
      "time_slot": "2:15PM - 5:15PM",
      "classes": [
        { "venue": "PCU 1", "course_code": "BBAF404", "course_name": "Money and Capital Markets", "lecturer": "Ms. Liquenda Torgbor", "programme": "ACT" },
        { "venue": "PCU 2", "course_code": "BMKT406", "course_name": "Marketing of Financial Services", "lecturer": "Dr. Juliana Andoh", "programme": "MKT" },
        { "venue": "PCU 3", "course_code": "BBAF402", "course_name": "International Trade Finance", "lecturer": "Dr. Abubakar Musah", "programme": "ACT" },
        { "venue": "PCU 4", "course_code": "BACT402", "course_name": "Corporate Reporting II", "lecturer": "Dr. Philomena Acquah", "programme": "AF2" },
        { "venue": "LBC402A", "course_code": "BBAF306", "course_name": "Regulatory and Legal Framework for Financial Institutions", "lecturer": "Mrs. Deborah Adu Twumwaa", "programme": "AS" },
        { "venue": "PCU 5", "course_code": "BBAF412", "course_name": "Business Analysis and Financial Policy", "lecturer": "Mr. Kwame Fosu Boateng", "programme": "ACT" },
        { "venue": "PCU 6", "course_code": "PBPR414", "course_name": "Indigenous Communication", "lecturer": "S. Glover Asante", "programme": "PR" },
        { "venue": "LBC302A", "course_code": "BRMF412", "course_name": "Procurement & Contract Management", "lecturer": "Ms. Serwaa Asubonteng", "programme": "RE" }
      ]
    },
    {
      "day": "Friday",
      "time_slot": "7:30AM - 10:30AM",
      "classes": [
        { "venue": "LBC302A", "course_code": "BASC412", "course_name": "Investment & Portfolio Management", "lecturer": "Mrs. Modupeola Dzorka", "programme": "AS" },
        { "venue": "PCU 1", "course_code": "PBPR406", "course_name": "Development Communication", "lecturer": "Sandra Yeboah", "programme": "PR" },
        { "venue": "LBC102A", "course_code": "BRMF408", "course_name": "Contemporary Issues in Real Estate Development", "lecturer": "Dr. Stanislaus Adiaba", "programme": "RE" },
        { "venue": "AB 2", "course_code": "BASC412", "course_name": "Data & Machine Learning", "lecturer": "Mr. Evans Tee", "programme": "AS" },
        { "venue": "PCU 2", "course_code": "BBBA408", "course_name": "Environmental Management", "lecturer": "Dr. Edward Koomson", "programme": "ADM" }
      ]
    }
  ]
};

function parseTimeSlot(timeSlot: string): { start_time: string; end_time: string } {
  const [startTime, endTime] = timeSlot.split(' - ');
  
  // Format times to be consistent
  const formatTime = (time: string) => {
    // Remove any extra spaces and ensure consistent format
    return time.trim().replace(/(\d+)(AM|PM)/, '$1 $2');
  };
  
  return {
    start_time: formatTime(startTime),
    end_time: formatTime(endTime)
  };
}

async function seedSchedules() {
  console.log('Starting to seed Level 400 schedule data...');
  
  try {
    const schedulesCollection = collection(db, 'schedules');
    let totalAdded = 0;
    
    for (const scheduleEntry of scheduleData.schedule) {
      const { start_time, end_time } = parseTimeSlot(scheduleEntry.time_slot);
      
      for (const classEntry of scheduleEntry.classes) {
        const scheduleDoc = {
          course_name: classEntry.course_name,
          course_code: classEntry.course_code,
          day: scheduleEntry.day,
          start_time: start_time,
          end_time: end_time,
          venue: classEntry.venue,
          lecturer: classEntry.lecturer,
          programme: classEntry.programme,
          level: 'Level 400'
        };
        
        await addDoc(schedulesCollection, scheduleDoc);
        totalAdded++;
        
        console.log(`Added: ${classEntry.course_code} - ${classEntry.course_name} (${scheduleEntry.day} ${start_time})`);
      }
    }
    
    console.log(`✅ Successfully seeded ${totalAdded} schedule documents to Firestore!`);
    console.log(`📚 Level 400 timetable for ${scheduleData.university}`);
    console.log(`📅 ${scheduleData.academic_year} - ${scheduleData.semester}`);
    
  } catch (error) {
    console.error('❌ Error seeding schedules:', error);
    throw error;
  }
}

// Run the seed function
seedSchedules()
  .then(() => {
    console.log('🎉 Seed script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
