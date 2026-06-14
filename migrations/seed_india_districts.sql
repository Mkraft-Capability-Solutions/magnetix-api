-- ========================================
-- INDIA DISTRICTS DATA
-- ========================================
-- All districts of India organized by State/UT
-- ========================================

USE lms_db;

-- ========================================
-- ANDHRA PRADESH DISTRICTS (26)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'AP' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Anantapur'),
(@state_id, 'Chittoor'),
(@state_id, 'East Godavari'),
(@state_id, 'Guntur'),
(@state_id, 'Krishna'),
(@state_id, 'Kurnool'),
(@state_id, 'Nellore'),
(@state_id, 'Prakasam'),
(@state_id, 'Srikakulam'),
(@state_id, 'Visakhapatnam'),
(@state_id, 'Vizianagaram'),
(@state_id, 'West Godavari'),
(@state_id, 'YSR Kadapa'),
(@state_id, 'Alluri Sitharama Raju'),
(@state_id, 'Anakapalli'),
(@state_id, 'Annamayya'),
(@state_id, 'Bapatla'),
(@state_id, 'Eluru'),
(@state_id, 'Kakinada'),
(@state_id, 'Konaseema'),
(@state_id, 'Nandyal'),
(@state_id, 'NTR'),
(@state_id, 'Palnadu'),
(@state_id, 'Parvathipuram Manyam'),
(@state_id, 'Sri Sathya Sai'),
(@state_id, 'Tirupati');

-- ========================================
-- ARUNACHAL PRADESH DISTRICTS (25)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'AR' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Anjaw'),
(@state_id, 'Changlang'),
(@state_id, 'East Kameng'),
(@state_id, 'East Siang'),
(@state_id, 'Kamle'),
(@state_id, 'Kra Daadi'),
(@state_id, 'Kurung Kumey'),
(@state_id, 'Lepa Rada'),
(@state_id, 'Lohit'),
(@state_id, 'Longding'),
(@state_id, 'Lower Dibang Valley'),
(@state_id, 'Lower Siang'),
(@state_id, 'Lower Subansiri'),
(@state_id, 'Namsai'),
(@state_id, 'Pakke Kessang'),
(@state_id, 'Papum Pare'),
(@state_id, 'Shi Yomi'),
(@state_id, 'Siang'),
(@state_id, 'Tawang'),
(@state_id, 'Tirap'),
(@state_id, 'Upper Dibang Valley'),
(@state_id, 'Upper Siang'),
(@state_id, 'Upper Subansiri'),
(@state_id, 'West Kameng'),
(@state_id, 'West Siang');

-- ========================================
-- ASSAM DISTRICTS (35)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'AS' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Baksa'),
(@state_id, 'Barpeta'),
(@state_id, 'Biswanath'),
(@state_id, 'Bongaigaon'),
(@state_id, 'Cachar'),
(@state_id, 'Charaideo'),
(@state_id, 'Chirang'),
(@state_id, 'Darrang'),
(@state_id, 'Dhemaji'),
(@state_id, 'Dhubri'),
(@state_id, 'Dibrugarh'),
(@state_id, 'Dima Hasao'),
(@state_id, 'Goalpara'),
(@state_id, 'Golaghat'),
(@state_id, 'Hailakandi'),
(@state_id, 'Hojai'),
(@state_id, 'Jorhat'),
(@state_id, 'Kamrup'),
(@state_id, 'Kamrup Metropolitan'),
(@state_id, 'Karbi Anglong'),
(@state_id, 'Karimganj'),
(@state_id, 'Kokrajhar'),
(@state_id, 'Lakhimpur'),
(@state_id, 'Majuli'),
(@state_id, 'Morigaon'),
(@state_id, 'Nagaon'),
(@state_id, 'Nalbari'),
(@state_id, 'Sivasagar'),
(@state_id, 'Sonitpur'),
(@state_id, 'South Salmara-Mankachar'),
(@state_id, 'Tinsukia'),
(@state_id, 'Udalguri'),
(@state_id, 'West Karbi Anglong'),
(@state_id, 'Bajali'),
(@state_id, 'Tamulpur');

-- ========================================
-- BIHAR DISTRICTS (38)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'BR' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Araria'),
(@state_id, 'Arwal'),
(@state_id, 'Aurangabad'),
(@state_id, 'Banka'),
(@state_id, 'Begusarai'),
(@state_id, 'Bhagalpur'),
(@state_id, 'Bhojpur'),
(@state_id, 'Buxar'),
(@state_id, 'Darbhanga'),
(@state_id, 'East Champaran'),
(@state_id, 'Gaya'),
(@state_id, 'Gopalganj'),
(@state_id, 'Jamui'),
(@state_id, 'Jehanabad'),
(@state_id, 'Kaimur'),
(@state_id, 'Katihar'),
(@state_id, 'Khagaria'),
(@state_id, 'Kishanganj'),
(@state_id, 'Lakhisarai'),
(@state_id, 'Madhepura'),
(@state_id, 'Madhubani'),
(@state_id, 'Munger'),
(@state_id, 'Muzaffarpur'),
(@state_id, 'Nalanda'),
(@state_id, 'Nawada'),
(@state_id, 'Patna'),
(@state_id, 'Purnia'),
(@state_id, 'Rohtas'),
(@state_id, 'Saharsa'),
(@state_id, 'Samastipur'),
(@state_id, 'Saran'),
(@state_id, 'Sheikhpura'),
(@state_id, 'Sheohar'),
(@state_id, 'Sitamarhi'),
(@state_id, 'Siwan'),
(@state_id, 'Supaul'),
(@state_id, 'Vaishali'),
(@state_id, 'West Champaran');

-- ========================================
-- CHHATTISGARH DISTRICTS (33)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'CG' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Balod'),
(@state_id, 'Baloda Bazar'),
(@state_id, 'Balrampur'),
(@state_id, 'Bastar'),
(@state_id, 'Bemetara'),
(@state_id, 'Bijapur'),
(@state_id, 'Bilaspur'),
(@state_id, 'Dantewada'),
(@state_id, 'Dhamtari'),
(@state_id, 'Durg'),
(@state_id, 'Gariaband'),
(@state_id, 'Gaurela-Pendra-Marwahi'),
(@state_id, 'Janjgir-Champa'),
(@state_id, 'Jashpur'),
(@state_id, 'Kabirdham'),
(@state_id, 'Kanker'),
(@state_id, 'Kondagaon'),
(@state_id, 'Korba'),
(@state_id, 'Koriya'),
(@state_id, 'Mahasamund'),
(@state_id, 'Mungeli'),
(@state_id, 'Narayanpur'),
(@state_id, 'Raigarh'),
(@state_id, 'Raipur'),
(@state_id, 'Rajnandgaon'),
(@state_id, 'Sukma'),
(@state_id, 'Surajpur'),
(@state_id, 'Surguja'),
(@state_id, 'Khairagarh-Chhuikhadan-Gandai'),
(@state_id, 'Manendragarh-Chirmiri-Bharatpur'),
(@state_id, 'Mohla-Manpur-Ambagarh Chowki'),
(@state_id, 'Sarangarh-Bilaigarh'),
(@state_id, 'Shakti');

-- ========================================
-- GOA DISTRICTS (2)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'GA' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'North Goa'),
(@state_id, 'South Goa');

-- ========================================
-- GUJARAT DISTRICTS (33)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'GJ' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Ahmedabad'),
(@state_id, 'Amreli'),
(@state_id, 'Anand'),
(@state_id, 'Aravalli'),
(@state_id, 'Banaskantha'),
(@state_id, 'Bharuch'),
(@state_id, 'Bhavnagar'),
(@state_id, 'Botad'),
(@state_id, 'Chhota Udaipur'),
(@state_id, 'Dahod'),
(@state_id, 'Dang'),
(@state_id, 'Devbhoomi Dwarka'),
(@state_id, 'Gandhinagar'),
(@state_id, 'Gir Somnath'),
(@state_id, 'Jamnagar'),
(@state_id, 'Junagadh'),
(@state_id, 'Kheda'),
(@state_id, 'Kutch'),
(@state_id, 'Mahisagar'),
(@state_id, 'Mehsana'),
(@state_id, 'Morbi'),
(@state_id, 'Narmada'),
(@state_id, 'Navsari'),
(@state_id, 'Panchmahal'),
(@state_id, 'Patan'),
(@state_id, 'Porbandar'),
(@state_id, 'Rajkot'),
(@state_id, 'Sabarkantha'),
(@state_id, 'Surat'),
(@state_id, 'Surendranagar'),
(@state_id, 'Tapi'),
(@state_id, 'Vadodara'),
(@state_id, 'Valsad');

-- ========================================
-- HARYANA DISTRICTS (22)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'HR' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Ambala'),
(@state_id, 'Bhiwani'),
(@state_id, 'Charkhi Dadri'),
(@state_id, 'Faridabad'),
(@state_id, 'Fatehabad'),
(@state_id, 'Gurugram'),
(@state_id, 'Hisar'),
(@state_id, 'Jhajjar'),
(@state_id, 'Jind'),
(@state_id, 'Kaithal'),
(@state_id, 'Karnal'),
(@state_id, 'Kurukshetra'),
(@state_id, 'Mahendragarh'),
(@state_id, 'Nuh'),
(@state_id, 'Palwal'),
(@state_id, 'Panchkula'),
(@state_id, 'Panipat'),
(@state_id, 'Rewari'),
(@state_id, 'Rohtak'),
(@state_id, 'Sirsa'),
(@state_id, 'Sonipat'),
(@state_id, 'Yamunanagar');

-- ========================================
-- HIMACHAL PRADESH DISTRICTS (12)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'HP' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Bilaspur'),
(@state_id, 'Chamba'),
(@state_id, 'Hamirpur'),
(@state_id, 'Kangra'),
(@state_id, 'Kinnaur'),
(@state_id, 'Kullu'),
(@state_id, 'Lahaul and Spiti'),
(@state_id, 'Mandi'),
(@state_id, 'Shimla'),
(@state_id, 'Sirmaur'),
(@state_id, 'Solan'),
(@state_id, 'Una');

-- ========================================
-- JHARKHAND DISTRICTS (24)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'JH' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Bokaro'),
(@state_id, 'Chatra'),
(@state_id, 'Deoghar'),
(@state_id, 'Dhanbad'),
(@state_id, 'Dumka'),
(@state_id, 'East Singhbhum'),
(@state_id, 'Garhwa'),
(@state_id, 'Giridih'),
(@state_id, 'Godda'),
(@state_id, 'Gumla'),
(@state_id, 'Hazaribagh'),
(@state_id, 'Jamtara'),
(@state_id, 'Khunti'),
(@state_id, 'Koderma'),
(@state_id, 'Latehar'),
(@state_id, 'Lohardaga'),
(@state_id, 'Pakur'),
(@state_id, 'Palamu'),
(@state_id, 'Ramgarh'),
(@state_id, 'Ranchi'),
(@state_id, 'Sahebganj'),
(@state_id, 'Seraikela Kharsawan'),
(@state_id, 'Simdega'),
(@state_id, 'West Singhbhum');

-- ========================================
-- KARNATAKA DISTRICTS (31)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'KA' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Bagalkot'),
(@state_id, 'Ballari'),
(@state_id, 'Belagavi'),
(@state_id, 'Bengaluru Rural'),
(@state_id, 'Bengaluru Urban'),
(@state_id, 'Bidar'),
(@state_id, 'Chamarajanagar'),
(@state_id, 'Chikballapur'),
(@state_id, 'Chikkamagaluru'),
(@state_id, 'Chitradurga'),
(@state_id, 'Dakshina Kannada'),
(@state_id, 'Davanagere'),
(@state_id, 'Dharwad'),
(@state_id, 'Gadag'),
(@state_id, 'Hassan'),
(@state_id, 'Haveri'),
(@state_id, 'Kalaburagi'),
(@state_id, 'Kodagu'),
(@state_id, 'Kolar'),
(@state_id, 'Koppal'),
(@state_id, 'Mandya'),
(@state_id, 'Mysuru'),
(@state_id, 'Raichur'),
(@state_id, 'Ramanagara'),
(@state_id, 'Shivamogga'),
(@state_id, 'Tumakuru'),
(@state_id, 'Udupi'),
(@state_id, 'Uttara Kannada'),
(@state_id, 'Vijayapura'),
(@state_id, 'Yadgir'),
(@state_id, 'Vijayanagara');

-- ========================================
-- KERALA DISTRICTS (14)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'KL' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Alappuzha'),
(@state_id, 'Ernakulam'),
(@state_id, 'Idukki'),
(@state_id, 'Kannur'),
(@state_id, 'Kasaragod'),
(@state_id, 'Kollam'),
(@state_id, 'Kottayam'),
(@state_id, 'Kozhikode'),
(@state_id, 'Malappuram'),
(@state_id, 'Palakkad'),
(@state_id, 'Pathanamthitta'),
(@state_id, 'Thiruvananthapuram'),
(@state_id, 'Thrissur'),
(@state_id, 'Wayanad');

-- ========================================
-- MADHYA PRADESH DISTRICTS (52)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'MP' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Agar Malwa'),
(@state_id, 'Alirajpur'),
(@state_id, 'Anuppur'),
(@state_id, 'Ashoknagar'),
(@state_id, 'Balaghat'),
(@state_id, 'Barwani'),
(@state_id, 'Betul'),
(@state_id, 'Bhind'),
(@state_id, 'Bhopal'),
(@state_id, 'Burhanpur'),
(@state_id, 'Chhatarpur'),
(@state_id, 'Chhindwara'),
(@state_id, 'Damoh'),
(@state_id, 'Datia'),
(@state_id, 'Dewas'),
(@state_id, 'Dhar'),
(@state_id, 'Dindori'),
(@state_id, 'Guna'),
(@state_id, 'Gwalior'),
(@state_id, 'Harda'),
(@state_id, 'Hoshangabad'),
(@state_id, 'Indore'),
(@state_id, 'Jabalpur'),
(@state_id, 'Jhabua'),
(@state_id, 'Katni'),
(@state_id, 'Khandwa'),
(@state_id, 'Khargone'),
(@state_id, 'Mandla'),
(@state_id, 'Mandsaur'),
(@state_id, 'Morena'),
(@state_id, 'Narsinghpur'),
(@state_id, 'Neemuch'),
(@state_id, 'Panna'),
(@state_id, 'Raisen'),
(@state_id, 'Rajgarh'),
(@state_id, 'Ratlam'),
(@state_id, 'Rewa'),
(@state_id, 'Sagar'),
(@state_id, 'Satna'),
(@state_id, 'Sehore'),
(@state_id, 'Seoni'),
(@state_id, 'Shahdol'),
(@state_id, 'Shajapur'),
(@state_id, 'Sheopur'),
(@state_id, 'Shivpuri'),
(@state_id, 'Sidhi'),
(@state_id, 'Singrauli'),
(@state_id, 'Tikamgarh'),
(@state_id, 'Ujjain'),
(@state_id, 'Umaria'),
(@state_id, 'Vidisha'),
(@state_id, 'Niwari');

-- ========================================
-- MAHARASHTRA DISTRICTS (36)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'MH' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Ahmednagar'),
(@state_id, 'Akola'),
(@state_id, 'Amravati'),
(@state_id, 'Aurangabad'),
(@state_id, 'Beed'),
(@state_id, 'Bhandara'),
(@state_id, 'Buldhana'),
(@state_id, 'Chandrapur'),
(@state_id, 'Dhule'),
(@state_id, 'Gadchiroli'),
(@state_id, 'Gondia'),
(@state_id, 'Hingoli'),
(@state_id, 'Jalgaon'),
(@state_id, 'Jalna'),
(@state_id, 'Kolhapur'),
(@state_id, 'Latur'),
(@state_id, 'Mumbai City'),
(@state_id, 'Mumbai Suburban'),
(@state_id, 'Nagpur'),
(@state_id, 'Nanded'),
(@state_id, 'Nandurbar'),
(@state_id, 'Nashik'),
(@state_id, 'Osmanabad'),
(@state_id, 'Palghar'),
(@state_id, 'Parbhani'),
(@state_id, 'Pune'),
(@state_id, 'Raigad'),
(@state_id, 'Ratnagiri'),
(@state_id, 'Sangli'),
(@state_id, 'Satara'),
(@state_id, 'Sindhudurg'),
(@state_id, 'Solapur'),
(@state_id, 'Thane'),
(@state_id, 'Wardha'),
(@state_id, 'Washim'),
(@state_id, 'Yavatmal');

-- ========================================
-- MANIPUR DISTRICTS (16)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'MN' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Bishnupur'),
(@state_id, 'Chandel'),
(@state_id, 'Churachandpur'),
(@state_id, 'Imphal East'),
(@state_id, 'Imphal West'),
(@state_id, 'Jiribam'),
(@state_id, 'Kakching'),
(@state_id, 'Kamjong'),
(@state_id, 'Kangpokpi'),
(@state_id, 'Noney'),
(@state_id, 'Pherzawl'),
(@state_id, 'Senapati'),
(@state_id, 'Tamenglong'),
(@state_id, 'Tengnoupal'),
(@state_id, 'Thoubal'),
(@state_id, 'Ukhrul');

-- ========================================
-- MEGHALAYA DISTRICTS (12)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'ML' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'East Garo Hills'),
(@state_id, 'East Jaintia Hills'),
(@state_id, 'East Khasi Hills'),
(@state_id, 'North Garo Hills'),
(@state_id, 'Ri Bhoi'),
(@state_id, 'South Garo Hills'),
(@state_id, 'South West Garo Hills'),
(@state_id, 'South West Khasi Hills'),
(@state_id, 'West Garo Hills'),
(@state_id, 'West Jaintia Hills'),
(@state_id, 'West Khasi Hills'),
(@state_id, 'Eastern West Khasi Hills');

-- ========================================
-- MIZORAM DISTRICTS (11)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'MZ' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Aizawl'),
(@state_id, 'Champhai'),
(@state_id, 'Hnahthial'),
(@state_id, 'Khawzawl'),
(@state_id, 'Kolasib'),
(@state_id, 'Lawngtlai'),
(@state_id, 'Lunglei'),
(@state_id, 'Mamit'),
(@state_id, 'Saiha'),
(@state_id, 'Saitual'),
(@state_id, 'Serchhip');

-- ========================================
-- NAGALAND DISTRICTS (16)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'NL' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Chumoukedima'),
(@state_id, 'Dimapur'),
(@state_id, 'Kiphire'),
(@state_id, 'Kohima'),
(@state_id, 'Longleng'),
(@state_id, 'Mokokchung'),
(@state_id, 'Mon'),
(@state_id, 'Niuland'),
(@state_id, 'Noklak'),
(@state_id, 'Peren'),
(@state_id, 'Phek'),
(@state_id, 'Shamator'),
(@state_id, 'Tseminyu'),
(@state_id, 'Tuensang'),
(@state_id, 'Wokha'),
(@state_id, 'Zunheboto');

-- ========================================
-- ODISHA DISTRICTS (30)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'OD' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Angul'),
(@state_id, 'Balangir'),
(@state_id, 'Balasore'),
(@state_id, 'Bargarh'),
(@state_id, 'Bhadrak'),
(@state_id, 'Boudh'),
(@state_id, 'Cuttack'),
(@state_id, 'Deogarh'),
(@state_id, 'Dhenkanal'),
(@state_id, 'Gajapati'),
(@state_id, 'Ganjam'),
(@state_id, 'Jagatsinghpur'),
(@state_id, 'Jajpur'),
(@state_id, 'Jharsuguda'),
(@state_id, 'Kalahandi'),
(@state_id, 'Kandhamal'),
(@state_id, 'Kendrapara'),
(@state_id, 'Kendujhar'),
(@state_id, 'Khordha'),
(@state_id, 'Koraput'),
(@state_id, 'Malkangiri'),
(@state_id, 'Mayurbhanj'),
(@state_id, 'Nabarangpur'),
(@state_id, 'Nayagarh'),
(@state_id, 'Nuapada'),
(@state_id, 'Puri'),
(@state_id, 'Rayagada'),
(@state_id, 'Sambalpur'),
(@state_id, 'Subarnapur'),
(@state_id, 'Sundargarh');

-- ========================================
-- PUNJAB DISTRICTS (23)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'PB' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Amritsar'),
(@state_id, 'Barnala'),
(@state_id, 'Bathinda'),
(@state_id, 'Faridkot'),
(@state_id, 'Fatehgarh Sahib'),
(@state_id, 'Fazilka'),
(@state_id, 'Ferozepur'),
(@state_id, 'Gurdaspur'),
(@state_id, 'Hoshiarpur'),
(@state_id, 'Jalandhar'),
(@state_id, 'Kapurthala'),
(@state_id, 'Ludhiana'),
(@state_id, 'Malerkotla'),
(@state_id, 'Mansa'),
(@state_id, 'Moga'),
(@state_id, 'Muktsar'),
(@state_id, 'Pathankot'),
(@state_id, 'Patiala'),
(@state_id, 'Rupnagar'),
(@state_id, 'SAS Nagar'),
(@state_id, 'Sangrur'),
(@state_id, 'SBS Nagar'),
(@state_id, 'Tarn Taran');

-- ========================================
-- RAJASTHAN DISTRICTS (33)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'RJ' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Ajmer'),
(@state_id, 'Alwar'),
(@state_id, 'Banswara'),
(@state_id, 'Baran'),
(@state_id, 'Barmer'),
(@state_id, 'Bharatpur'),
(@state_id, 'Bhilwara'),
(@state_id, 'Bikaner'),
(@state_id, 'Bundi'),
(@state_id, 'Chittorgarh'),
(@state_id, 'Churu'),
(@state_id, 'Dausa'),
(@state_id, 'Dholpur'),
(@state_id, 'Dungarpur'),
(@state_id, 'Hanumangarh'),
(@state_id, 'Jaipur'),
(@state_id, 'Jaisalmer'),
(@state_id, 'Jalore'),
(@state_id, 'Jhalawar'),
(@state_id, 'Jhunjhunu'),
(@state_id, 'Jodhpur'),
(@state_id, 'Karauli'),
(@state_id, 'Kota'),
(@state_id, 'Nagaur'),
(@state_id, 'Pali'),
(@state_id, 'Pratapgarh'),
(@state_id, 'Rajsamand'),
(@state_id, 'Sawai Madhopur'),
(@state_id, 'Sikar'),
(@state_id, 'Sirohi'),
(@state_id, 'Sri Ganganagar'),
(@state_id, 'Tonk'),
(@state_id, 'Udaipur');

-- ========================================
-- SIKKIM DISTRICTS (6)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'SK' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'East Sikkim'),
(@state_id, 'North Sikkim'),
(@state_id, 'Pakyong'),
(@state_id, 'Soreng'),
(@state_id, 'South Sikkim'),
(@state_id, 'West Sikkim');

-- ========================================
-- TAMIL NADU DISTRICTS (38)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'TN' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Ariyalur'),
(@state_id, 'Chengalpattu'),
(@state_id, 'Chennai'),
(@state_id, 'Coimbatore'),
(@state_id, 'Cuddalore'),
(@state_id, 'Dharmapuri'),
(@state_id, 'Dindigul'),
(@state_id, 'Erode'),
(@state_id, 'Kallakurichi'),
(@state_id, 'Kanchipuram'),
(@state_id, 'Kanyakumari'),
(@state_id, 'Karur'),
(@state_id, 'Krishnagiri'),
(@state_id, 'Madurai'),
(@state_id, 'Mayiladuthurai'),
(@state_id, 'Nagapattinam'),
(@state_id, 'Namakkal'),
(@state_id, 'Nilgiris'),
(@state_id, 'Perambalur'),
(@state_id, 'Pudukkottai'),
(@state_id, 'Ramanathapuram'),
(@state_id, 'Ranipet'),
(@state_id, 'Salem'),
(@state_id, 'Sivaganga'),
(@state_id, 'Tenkasi'),
(@state_id, 'Thanjavur'),
(@state_id, 'Theni'),
(@state_id, 'Thoothukudi'),
(@state_id, 'Tiruchirappalli'),
(@state_id, 'Tirunelveli'),
(@state_id, 'Tirupathur'),
(@state_id, 'Tiruppur'),
(@state_id, 'Tiruvallur'),
(@state_id, 'Tiruvannamalai'),
(@state_id, 'Tiruvarur'),
(@state_id, 'Vellore'),
(@state_id, 'Viluppuram'),
(@state_id, 'Virudhunagar');

-- ========================================
-- TELANGANA DISTRICTS (33)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'TS' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Adilabad'),
(@state_id, 'Bhadradri Kothagudem'),
(@state_id, 'Hyderabad'),
(@state_id, 'Jagtial'),
(@state_id, 'Jangaon'),
(@state_id, 'Jayashankar Bhupalpally'),
(@state_id, 'Jogulamba Gadwal'),
(@state_id, 'Kamareddy'),
(@state_id, 'Karimnagar'),
(@state_id, 'Khammam'),
(@state_id, 'Kumuram Bheem'),
(@state_id, 'Mahabubabad'),
(@state_id, 'Mahabubnagar'),
(@state_id, 'Mancherial'),
(@state_id, 'Medak'),
(@state_id, 'Medchal-Malkajgiri'),
(@state_id, 'Mulugu'),
(@state_id, 'Nagarkurnool'),
(@state_id, 'Nalgonda'),
(@state_id, 'Narayanpet'),
(@state_id, 'Nirmal'),
(@state_id, 'Nizamabad'),
(@state_id, 'Peddapalli'),
(@state_id, 'Rajanna Sircilla'),
(@state_id, 'Rangareddy'),
(@state_id, 'Sangareddy'),
(@state_id, 'Siddipet'),
(@state_id, 'Suryapet'),
(@state_id, 'Vikarabad'),
(@state_id, 'Wanaparthy'),
(@state_id, 'Warangal'),
(@state_id, 'Hanamkonda'),
(@state_id, 'Yadadri Bhuvanagiri');

-- ========================================
-- TRIPURA DISTRICTS (8)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'TR' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Dhalai'),
(@state_id, 'Gomati'),
(@state_id, 'Khowai'),
(@state_id, 'North Tripura'),
(@state_id, 'Sepahijala'),
(@state_id, 'South Tripura'),
(@state_id, 'Unakoti'),
(@state_id, 'West Tripura');

-- ========================================
-- UTTAR PRADESH DISTRICTS (75)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'UP' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Agra'),
(@state_id, 'Aligarh'),
(@state_id, 'Ambedkar Nagar'),
(@state_id, 'Amethi'),
(@state_id, 'Amroha'),
(@state_id, 'Auraiya'),
(@state_id, 'Ayodhya'),
(@state_id, 'Azamgarh'),
(@state_id, 'Baghpat'),
(@state_id, 'Bahraich'),
(@state_id, 'Ballia'),
(@state_id, 'Balrampur'),
(@state_id, 'Banda'),
(@state_id, 'Barabanki'),
(@state_id, 'Bareilly'),
(@state_id, 'Basti'),
(@state_id, 'Bhadohi'),
(@state_id, 'Bijnor'),
(@state_id, 'Budaun'),
(@state_id, 'Bulandshahr'),
(@state_id, 'Chandauli'),
(@state_id, 'Chitrakoot'),
(@state_id, 'Deoria'),
(@state_id, 'Etah'),
(@state_id, 'Etawah'),
(@state_id, 'Farrukhabad'),
(@state_id, 'Fatehpur'),
(@state_id, 'Firozabad'),
(@state_id, 'Gautam Buddha Nagar'),
(@state_id, 'Ghaziabad'),
(@state_id, 'Ghazipur'),
(@state_id, 'Gonda'),
(@state_id, 'Gorakhpur'),
(@state_id, 'Hamirpur'),
(@state_id, 'Hapur'),
(@state_id, 'Hardoi'),
(@state_id, 'Hathras'),
(@state_id, 'Jalaun'),
(@state_id, 'Jaunpur'),
(@state_id, 'Jhansi'),
(@state_id, 'Kannauj'),
(@state_id, 'Kanpur Dehat'),
(@state_id, 'Kanpur Nagar'),
(@state_id, 'Kasganj'),
(@state_id, 'Kaushambi'),
(@state_id, 'Kushinagar'),
(@state_id, 'Lakhimpur Kheri'),
(@state_id, 'Lalitpur'),
(@state_id, 'Lucknow'),
(@state_id, 'Maharajganj'),
(@state_id, 'Mahoba'),
(@state_id, 'Mainpuri'),
(@state_id, 'Mathura'),
(@state_id, 'Mau'),
(@state_id, 'Meerut'),
(@state_id, 'Mirzapur'),
(@state_id, 'Moradabad'),
(@state_id, 'Muzaffarnagar'),
(@state_id, 'Pilibhit'),
(@state_id, 'Pratapgarh'),
(@state_id, 'Prayagraj'),
(@state_id, 'Raebareli'),
(@state_id, 'Rampur'),
(@state_id, 'Saharanpur'),
(@state_id, 'Sambhal'),
(@state_id, 'Sant Kabir Nagar'),
(@state_id, 'Shahjahanpur'),
(@state_id, 'Shamli'),
(@state_id, 'Shravasti'),
(@state_id, 'Siddharthnagar'),
(@state_id, 'Sitapur'),
(@state_id, 'Sonbhadra'),
(@state_id, 'Sultanpur'),
(@state_id, 'Unnao'),
(@state_id, 'Varanasi');

-- ========================================
-- UTTARAKHAND DISTRICTS (13)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'UK' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Almora'),
(@state_id, 'Bageshwar'),
(@state_id, 'Chamoli'),
(@state_id, 'Champawat'),
(@state_id, 'Dehradun'),
(@state_id, 'Haridwar'),
(@state_id, 'Nainital'),
(@state_id, 'Pauri Garhwal'),
(@state_id, 'Pithoragarh'),
(@state_id, 'Rudraprayag'),
(@state_id, 'Tehri Garhwal'),
(@state_id, 'Udham Singh Nagar'),
(@state_id, 'Uttarkashi');

-- ========================================
-- WEST BENGAL DISTRICTS (23)
-- ========================================
SET @state_id = (SELECT id FROM states WHERE code = 'WB' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Alipurduar'),
(@state_id, 'Bankura'),
(@state_id, 'Birbhum'),
(@state_id, 'Cooch Behar'),
(@state_id, 'Dakshin Dinajpur'),
(@state_id, 'Darjeeling'),
(@state_id, 'Hooghly'),
(@state_id, 'Howrah'),
(@state_id, 'Jalpaiguri'),
(@state_id, 'Jhargram'),
(@state_id, 'Kalimpong'),
(@state_id, 'Kolkata'),
(@state_id, 'Malda'),
(@state_id, 'Murshidabad'),
(@state_id, 'Nadia'),
(@state_id, 'North 24 Parganas'),
(@state_id, 'Paschim Bardhaman'),
(@state_id, 'Paschim Medinipur'),
(@state_id, 'Purba Bardhaman'),
(@state_id, 'Purba Medinipur'),
(@state_id, 'Purulia'),
(@state_id, 'South 24 Parganas'),
(@state_id, 'Uttar Dinajpur');

-- ========================================
-- UNION TERRITORIES DISTRICTS
-- ========================================

-- Andaman and Nicobar Islands (3)
SET @state_id = (SELECT id FROM states WHERE code = 'AN' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Nicobar'),
(@state_id, 'North and Middle Andaman'),
(@state_id, 'South Andaman');

-- Chandigarh (1)
SET @state_id = (SELECT id FROM states WHERE code = 'CH' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Chandigarh');

-- Dadra and Nagar Haveli and Daman and Diu (3)
SET @state_id = (SELECT id FROM states WHERE code = 'DD' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Dadra and Nagar Haveli'),
(@state_id, 'Daman'),
(@state_id, 'Diu');

-- Delhi (11)
SET @state_id = (SELECT id FROM states WHERE code = 'DL' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Central Delhi'),
(@state_id, 'East Delhi'),
(@state_id, 'New Delhi'),
(@state_id, 'North Delhi'),
(@state_id, 'North East Delhi'),
(@state_id, 'North West Delhi'),
(@state_id, 'Shahdara'),
(@state_id, 'South Delhi'),
(@state_id, 'South East Delhi'),
(@state_id, 'South West Delhi'),
(@state_id, 'West Delhi');

-- Jammu and Kashmir (20)
SET @state_id = (SELECT id FROM states WHERE code = 'JK' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Anantnag'),
(@state_id, 'Bandipora'),
(@state_id, 'Baramulla'),
(@state_id, 'Budgam'),
(@state_id, 'Doda'),
(@state_id, 'Ganderbal'),
(@state_id, 'Jammu'),
(@state_id, 'Kathua'),
(@state_id, 'Kishtwar'),
(@state_id, 'Kulgam'),
(@state_id, 'Kupwara'),
(@state_id, 'Poonch'),
(@state_id, 'Pulwama'),
(@state_id, 'Rajouri'),
(@state_id, 'Ramban'),
(@state_id, 'Reasi'),
(@state_id, 'Samba'),
(@state_id, 'Shopian'),
(@state_id, 'Srinagar'),
(@state_id, 'Udhampur');

-- Ladakh (2)
SET @state_id = (SELECT id FROM states WHERE code = 'LA' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Kargil'),
(@state_id, 'Leh');

-- Lakshadweep (1)
SET @state_id = (SELECT id FROM states WHERE code = 'LD' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Lakshadweep');

-- Puducherry (4)
SET @state_id = (SELECT id FROM states WHERE code = 'PY' AND country_id = (SELECT id FROM countries WHERE code = 'IN'));
INSERT INTO `districts` (`state_id`, `name`) VALUES
(@state_id, 'Karaikal'),
(@state_id, 'Mahe'),
(@state_id, 'Puducherry'),
(@state_id, 'Yanam');

SELECT 'All India districts inserted successfully!' AS status;
