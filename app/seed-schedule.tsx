import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '@/lib/firebase';

interface ScheduleData {
  course_name: string;
  course_code: string;
  day: string;
  start_time: string;
  end_time: string;
  venue: string;
  lecturer: string;
  level: string;
  programme: string;
}

export default function SeedScheduleScreen() {
  const [loading, setLoading] = useState(false);
  const [documentsAdded, setDocumentsAdded] = useState(0);

  const scheduleData: ScheduleData[] = [
    // Monday 7:30AM-10:30AM
    { course_name: 'Corporate Reporting II', course_code: 'BACT402', day: 'Monday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU1', lecturer: 'Christian Mensah', level: 'Level 400', programme: 'ACT1' },
    { course_name: 'Supply Chain Management', course_code: 'BACT402', day: 'Monday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU2', lecturer: 'Dr. Linus Kudos', level: 'Level 400', programme: 'ADM1' },
    { course_name: 'Total Quality Management', course_code: 'BBBA404', day: 'Monday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU3', lecturer: 'Peter Kodjie', level: 'Level 400', programme: 'ADM4' },
    { course_name: 'Public Sector Accounting & Finance', course_code: 'BACT406', day: 'Monday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU4', lecturer: 'Salomey Addo', level: 'Level 400', programme: 'AF1' },
    { course_name: 'Advanced Macroeconomics', course_code: 'BBEC402', day: 'Monday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'LBC402A', lecturer: 'Mr. Emmanuel Lawluvi', level: 'Level 400', programme: 'BE' },
    { course_name: 'Speech Writing', course_code: 'PBPR404', day: 'Monday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU5', lecturer: 'Ivy Jones-Mensah', level: 'Level 400', programme: 'PR1' },
    { course_name: 'Professional Computing Practise', course_code: 'BITM402', day: 'Monday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU6', lecturer: 'Dr. Nurudeen Mohammed', level: 'Level 400', programme: 'IT' },

    // Monday 11:00AM-2:00PM
    { course_name: 'Public Sector Accounting & Finance', course_code: 'BACT406', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU1', lecturer: 'Salomey Addo', level: 'Level 400', programme: 'ACT1' },
    { course_name: 'Total Quality Management', course_code: 'BBBA404', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU2', lecturer: 'Peter Kodjie', level: 'Level 400', programme: 'ADM1' },
    { course_name: 'Supply Chain Management', course_code: 'BACT402', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU3', lecturer: 'Dr. Linus Kudos', level: 'Level 400', programme: 'ADM4' },
    { course_name: 'Corporate Reporting II', course_code: 'BACT402', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU4', lecturer: 'Christian Mensah', level: 'Level 400', programme: 'AF1' },
    { course_name: 'Pension Planning & Administration', course_code: 'BASC402', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'AB2', lecturer: 'Dr. Andrew Agblobi', level: 'Level 400', programme: 'AS' },
    { course_name: 'Financial Economics', course_code: 'BBEC406', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'LBC402A', lecturer: 'Michael Minlah', level: 'Level 400', programme: 'BE' },
    { course_name: 'Public Relations Strategy & Campaign Planning', course_code: 'PBPR402', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU5', lecturer: 'Richard Quarshigah', level: 'Level 400', programme: 'PR1' },
    { course_name: 'Speech Writing', course_code: 'PBPR404', day: 'Monday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU6', lecturer: 'Ivy Jones-Mensah', level: 'Level 400', programme: 'PR2' },

    // Monday 2:15PM-5:15PM
    { course_name: 'Corporate Reporting II', course_code: 'BACT402', day: 'Monday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU1', lecturer: 'Dr. Philomena Acquah', level: 'Level 400', programme: 'ACT2' },
    { course_name: 'Total Quality Management', course_code: 'BBBA404', day: 'Monday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU4', lecturer: 'Dr. Leeford Ameyibor', level: 'Level 400', programme: 'ADM2' },
    { course_name: 'International Human Resource Management', course_code: 'BBBA402', day: 'Monday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU2', lecturer: 'Dr. Rejoice Esi Asante', level: 'Level 400', programme: 'ADM5' },
    { course_name: 'Public Sector Accounting & Finance', course_code: 'BACT406', day: 'Monday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU3', lecturer: 'Salomey Addo', level: 'Level 400', programme: 'AF2' },
    { course_name: 'Information Management', course_code: 'BITM404', day: 'Monday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU6', lecturer: 'D. Aboagye-Darko', level: 'Level 400', programme: 'IT' },
    { course_name: 'Pension Fund Management', course_code: 'BASC402', day: 'Monday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'LBC402A', lecturer: 'Dr. Andrew Agblobi', level: 'Level 400', programme: 'AS' },
    { course_name: 'Public Relations Strategy & Campaign Planning', course_code: 'PBPR402', day: 'Monday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU5', lecturer: 'Mr. Richard Quarshigah', level: 'Level 400', programme: 'PR2' },

    // Tuesday 7:30AM-10:30AM
    { course_name: 'Public Sector Accounting & Finance', course_code: 'BACT406', day: 'Tuesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU1', lecturer: 'Salomey Addo', level: 'Level 400', programme: 'ACT2' },
    { course_name: 'Supply Chain Management', course_code: 'BBBA406', day: 'Tuesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU2', lecturer: 'Dr. Linus Kudu', level: 'Level 400', programme: 'ADM2' },
    { course_name: 'Total Quality Management', course_code: 'BBBA404', day: 'Tuesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU3', lecturer: 'Peter Kodjie', level: 'Level 400', programme: 'ADM5' },
    { course_name: 'Performance Management', course_code: 'BACT408', day: 'Tuesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU4', lecturer: 'Mr. Emmanuel Nketiah', level: 'Level 400', programme: 'AF2' },
    { course_name: 'Actuarial Professional Practice', course_code: 'BASC404', day: 'Tuesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'LBC402A', lecturer: 'Dr. Kofi Nyamekye', level: 'Level 400', programme: 'AS' },
    { course_name: 'Software Quality Management', course_code: 'BITM408', day: 'Tuesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU5', lecturer: 'Mr. Godwin Ntow Danso', level: 'Level 400', programme: 'IT' },
    { course_name: 'Retail Management', course_code: 'BMKT402', day: 'Tuesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU6', lecturer: 'Akwasi Sarfo Kantanka', level: 'Level 400', programme: 'MKT' },

    // Tuesday 11:00AM-2:00PM
    { course_name: 'Performance Management', course_code: 'BACT408', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU1', lecturer: 'Mr. Emmanuel Nketiah', level: 'Level 400', programme: 'ACT2' },
    { course_name: 'International Human Resource Management', course_code: 'BBBA402', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU2', lecturer: 'Marco Mensah', level: 'Level 400', programme: 'ADM2' },
    { course_name: 'Supply Chain Management', course_code: 'BBBA406', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU3', lecturer: 'Dr. Agnes A. Anima', level: 'Level 400', programme: 'ADM5' },
    { course_name: 'E-Commerce', course_code: 'BBBA412', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU4', lecturer: 'Mrs. Ivonne Nketiah', level: 'Level 400', programme: 'ADM3' },
    { course_name: 'Money and Capital Markets', course_code: 'BBAF404', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU5', lecturer: 'Dr. Josephine Mensah-Ababio', level: 'Level 400', programme: 'AF2' },
    { course_name: 'Microfinance Management', course_code: 'BBAF422', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'YAB4B', lecturer: 'Dr. Godwin Musah', level: 'Level 400', programme: 'BF' },
    { course_name: 'Health Insurance', course_code: 'BASC408', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'LBC402A', lecturer: 'Ms. Ishan Mohammed', level: 'Level 400', programme: 'AS' },
    { course_name: 'Public Relations Strategy & Campaign Planning', course_code: 'PBPR402', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU6', lecturer: 'Dr. Martin Segtub', level: 'Level 400', programme: 'PR3' },
    { course_name: 'Tourism Marketing', course_code: 'BMKT404', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'YAB5B', lecturer: 'Prof. Alex Preko', level: 'Level 400', programme: 'MKT' },
    { course_name: 'Real Estate Marketing & Brokerage', course_code: 'BRMF402', day: 'Tuesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'LBC102A', lecturer: 'Dr. Kailan Abdulhamid', level: 'Level 400', programme: 'RE' },

    // Tuesday 2:15PM-5:15PM
    { course_name: 'Corporate Reporting II', course_code: 'BACT402', day: 'Tuesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU1', lecturer: 'Dr. Philomena Acquah', level: 'Level 400', programme: 'ACT3' },
    { course_name: 'Total Quality Management', course_code: 'BBBA404', day: 'Tuesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU2', lecturer: 'Dr. Leeford Ameyibor', level: 'Level 400', programme: 'ADM3' },
    { course_name: 'Total Quality Management', course_code: 'BBBA404', day: 'Tuesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU3', lecturer: 'Dr. Leeford Ameyibor', level: 'Level 400', programme: 'ADM6' },
    { course_name: 'Money and Capital Markets', course_code: 'BBAF404', day: 'Tuesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU4', lecturer: 'Dr. Josephine Mensah-Ababio', level: 'Level 400', programme: 'AF3' },
    { course_name: 'Principles of Valuation II', course_code: 'BRMF404', day: 'Tuesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'LBC402A', lecturer: 'Dr. Stanislaus Adiaba', level: 'Level 400', programme: 'RE' },
    { course_name: 'International Trade Finance', course_code: 'BBAF402', day: 'Tuesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU5', lecturer: 'Dr. Abubakar Musah', level: 'Level 400', programme: 'BF' },
    { course_name: 'Mobile Web Development', course_code: 'BITM412', day: 'Tuesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'GH7', lecturer: 'Dr. Dickson Wornyo', level: 'Level 400', programme: 'IT' },

    // Wednesday 7:30AM-10:30AM
    { course_name: 'Public Sector Accounting and Finance', course_code: 'BACT406', day: 'Wednesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU1', lecturer: 'Mr. Desmond Aboagye', level: 'Level 400', programme: 'ACT3' },
    { course_name: 'Supply Chain Management', course_code: 'BBBA406', day: 'Wednesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU2', lecturer: 'Dr. Agnes A. Anima', level: 'Level 400', programme: 'ADM3' },
    { course_name: 'International Human Resource Management', course_code: 'BBBA402', day: 'Wednesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU3', lecturer: 'Ms. Hannah Acquah', level: 'Level 400', programme: 'ADM6' },
    { course_name: 'Performance Management', course_code: 'BACT408', day: 'Wednesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU4', lecturer: 'Mr. Emmanuel Nketiah', level: 'Level 400', programme: 'AF3' },
    { course_name: 'Real Estate Finance and Investment II', course_code: 'BRMF406', day: 'Wednesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'LBC102A', lecturer: 'Dr. Andrew Agblobi', level: 'Level 400', programme: 'RE' },
    { course_name: 'Bank Management', course_code: 'BBAF408', day: 'Wednesday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU5', lecturer: 'Dr. Lawrence Asare Boadi', level: 'Level 400', programme: 'BF' },

    // Wednesday 11:00AM-2:00PM
    { course_name: 'Performance Management', course_code: 'BACT408', day: 'Wednesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU1', lecturer: 'Dr. Emmanuel Debrah', level: 'Level 400', programme: 'ACT3' },
    { course_name: 'International Human Resource Management', course_code: 'BBBA402', day: 'Wednesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU2', lecturer: 'Ms. Hannah Acquah', level: 'Level 400', programme: 'ADM3' },
    { course_name: 'Supply Chain Management', course_code: 'BBBA406', day: 'Wednesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU3', lecturer: 'Dr. Stephen Antwi', level: 'Level 400', programme: 'ADM6' },
    { course_name: 'Game Theory and Business Applications', course_code: 'BBEC404', day: 'Wednesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'LBC402A', lecturer: 'Dr. Kwaku Amakye', level: 'Level 400', programme: 'BE' },
    { course_name: 'Business Analysis and Financial Policy', course_code: 'BBAF412', day: 'Wednesday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU3', lecturer: 'Mr. Kwame Fosu Boateng', level: 'Level 400', programme: 'BF' },

    // Wednesday 2:15PM-5:15PM
    { course_name: 'Advance E-Commerce', course_code: 'BBBA412', day: 'Wednesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU4', lecturer: 'Mr. Adnan Lamptey', level: 'Level 400', programme: 'ADM1' },
    { course_name: 'Public Sector Accounting and Finance', course_code: 'BACT406', day: 'Wednesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU5', lecturer: 'Mr. Desmond Aboagye', level: 'Level 400', programme: 'AF3' },
    { course_name: 'Computer & Network Security', course_code: 'BITM406', day: 'Wednesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU6', lecturer: 'Dr. Selasi Ocansey', level: 'Level 400', programme: 'IT' },
    { course_name: 'Public Finance', course_code: 'BBAF406', day: 'Wednesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'LBC102A', lecturer: 'Dr. Christopher Quaidoo', level: 'Level 400', programme: 'BE' },
    { course_name: 'Speech Writing', course_code: 'PBPR404', day: 'Wednesday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'YAB4B', lecturer: 'Prof. Adwoa Amankwaah', level: 'Level 400', programme: 'PR3' },

    // Thursday 7:30AM-10:30AM
    { course_name: 'Performance Management', course_code: 'BACT408', day: 'Thursday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'YAB1', lecturer: 'Dr. Emmanuel Debrah', level: 'Level 400', programme: 'ACT1' },
    { course_name: 'International Human Resource Management', course_code: 'BBBA402', day: 'Thursday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'YAB2A', lecturer: 'Marco Mensah', level: 'Level 400', programme: 'ADM1' },
    { course_name: 'Money and Capital Markets', course_code: 'BBAF404', day: 'Thursday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'YAB2B', lecturer: 'Dr. Nuhu Abduraman', level: 'Level 400', programme: 'AF1' },
    { course_name: 'Labour Economics II', course_code: 'BBEC406', day: 'Thursday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'LBC402A', lecturer: 'Mr. Alpha Ayine', level: 'Level 400', programme: 'BE' },

    // Thursday 11:00AM-2:00PM
    { course_name: 'International Human Resource Management', course_code: 'BBBA402', day: 'Thursday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU1', lecturer: 'Marco Mensah', level: 'Level 400', programme: 'ADM4' },
    { course_name: 'Advance E-Commerce', course_code: 'BBBA412', day: 'Thursday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU2', lecturer: 'Mr. Adnan Lamptey', level: 'Level 400', programme: 'ADM2' },
    { course_name: 'Performance Management', course_code: 'BACT408', day: 'Thursday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU3', lecturer: 'Dr. Emmanuel Debrah', level: 'Level 400', programme: 'AF1' },
    { course_name: 'Corporate Reporting II', course_code: 'BACT402', day: 'Thursday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'PCU4', lecturer: 'Dr. Philomena Acquah', level: 'Level 400', programme: 'AF3' },
    { course_name: 'Money Banking & Financial Markets', course_code: 'BBAF416', day: 'Thursday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'LBC102A', lecturer: 'Dr. Philomena Dadzie', level: 'Level 400', programme: 'AS' },
    { course_name: 'Energy Economics II', course_code: 'BBEC406', day: 'Thursday', start_time: '11:00 AM', end_time: '2:00 PM', venue: 'LBC202A', lecturer: 'Alpha Ayine', level: 'Level 400', programme: 'BE' },

    // Thursday 2:15PM-5:15PM
    { course_name: 'Money and Capital Markets', course_code: 'BBAF404', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU1', lecturer: 'Ms. Liquenda Torgbor', level: 'Level 400', programme: 'ACT' },
    { course_name: 'Marketing of Financial Services', course_code: 'BMKT406', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU2', lecturer: 'Dr. Juliana Andoh', level: 'Level 400', programme: 'MKT' },
    { course_name: 'International Trade Finance', course_code: 'BBAF402', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU3', lecturer: 'Dr. Abubakar Musah', level: 'Level 400', programme: 'ACT' },
    { course_name: 'Corporate Reporting II', course_code: 'BACT402', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU4', lecturer: 'Dr. Philomena Acquah', level: 'Level 400', programme: 'AF2' },
    { course_name: 'Regulatory and Legal Framework', course_code: 'BBAF306', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'LBC402A', lecturer: 'Mrs. Deborah Adu Twumwaa', level: 'Level 400', programme: 'AS' },
    { course_name: 'Business Analysis and Financial Policy', course_code: 'BBAF412', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU5', lecturer: 'Mr. Kwame Fosu Boateng', level: 'Level 400', programme: 'ACT' },
    { course_name: 'Indigenous Communication', course_code: 'PBPR414', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'PCU6', lecturer: 'S. Glover Asante', level: 'Level 400', programme: 'PR' },
    { course_name: 'Procurement & Contract Management', course_code: 'BRMF412', day: 'Thursday', start_time: '2:15 PM', end_time: '5:15 PM', venue: 'LBC302A', lecturer: 'Ms. Serwaa Asubonteng', level: 'Level 400', programme: 'RE' },

    // Friday 7:30AM-10:30AM
    { course_name: 'Investment & Portfolio Management', course_code: 'BASC412', day: 'Friday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'LBC302A', lecturer: 'Mrs. Modupeola Dzorka', level: 'Level 400', programme: 'AS' },
    { course_name: 'Development Communication', course_code: 'PBPR406', day: 'Friday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU1', lecturer: 'Sandra Yeboah', level: 'Level 400', programme: 'PR' },
    { course_name: 'Contemporary Issues in Real Estate Development', course_code: 'BRMF408', day: 'Friday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'LBC102A', lecturer: 'Dr. Stanislaus Adiaba', level: 'Level 400', programme: 'RE' },
    { course_name: 'Data & Machine Learning', course_code: 'BASC412', day: 'Friday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'AB2', lecturer: 'Mr. Evans Tee', level: 'Level 400', programme: 'AS' },
    { course_name: 'Environmental Management', course_code: 'BBBA408', day: 'Friday', start_time: '7:30 AM', end_time: '10:30 AM', venue: 'PCU2', lecturer: 'Dr. Edward Koomson', level: 'Level 400', programme: 'ADM' },
  ];

  const seedSchedule = async () => {
    setLoading(true);
    setDocumentsAdded(0);

    try {
      for (const schedule of scheduleData) {
        await addDoc(collection(db, 'schedules'), schedule);
        setDocumentsAdded(prev => prev + 1);
      }

      Alert.alert(
        'Success!',
        `Successfully seeded ${documentsAdded} schedule documents to Firestore.`
      );
    } catch (error) {
      console.error('Error seeding schedule:', error);
      Alert.alert('Error', 'Failed to seed schedule data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Seed Level 400 Timetable</Text>
        <Text style={styles.subtitle}>
          This will add {scheduleData.length} schedule documents to the Firestore 'schedules' collection.
        </Text>
        
        {documentsAdded > 0 && !loading && (
          <Text style={styles.successText}>
            ✅ {documentsAdded} documents added successfully!
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={seedSchedule}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.buttonText}>Seeding...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Seed Level 400 Timetable</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0088CC',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
