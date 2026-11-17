import {
  InventoryItem,
  LanguageMode,
  LocalizedText,
  MissionDef,
  OutfitId,
  RegionId,
  ShopItem,
  VehicleType,
} from './types';

export function t(text: LocalizedText, lang: LanguageMode): string {
  return text[lang];
}

export const REGION_NAMES: Record<RegionId, LocalizedText> = {
  desa: {
    ngoko: 'Desa Kerek (Batik Gedog)',
    krama: 'Dhusun Kerek (Bathik Gedhog)',
    indonesia: 'Desa Kerek & Grabagan',
  },
  kota: {
    ngoko: 'Kota Tuban (Bumi Wali)',
    krama: 'Kitha Tuban (Bumi Wali)',
    indonesia: 'Kota Tuban (Bumi Wali)',
  },
  pegunungan: {
    ngoko: 'Bukit Kapur & Nglirip',
    krama: 'Redi Kapur & Nglirip',
    indonesia: 'Pegunungan Kapur & Air Terjun Nglirip',
  },
  pesisir: {
    ngoko: 'Pesisir Pantura Pantai Boom',
    krama: 'Pasisir Pantura Pantai Boom',
    indonesia: 'Pesisir Pantura Tuban',
  },
  wisata: {
    ngoko: 'Wisata Goa Akbar & Bektiharjo',
    krama: 'Pariwisata Guwa Akbar & Bektiharjo',
    indonesia: 'Wisata Goa Akbar & Bektiharjo',
  },
};

export const VEHICLE_LABELS: Record<
  VehicleType,
  { name: string; category: 'motor' | 'mobil' | 'sepeda'; maxSpeed: number; accel: number; turnSpeed: number }
> = {
  motor_bebek: {
    name: 'Motor Bebek Supra',
    category: 'motor',
    maxSpeed: 28,
    accel: 18,
    turnSpeed: 2.8,
  },
  motor_matic: {
    name: 'Motor Matic Beat',
    category: 'motor',
    maxSpeed: 26,
    accel: 20,
    turnSpeed: 3.0,
  },
  motor_sport: {
    name: 'Motor Sport Ninja',
    category: 'motor',
    maxSpeed: 42,
    accel: 25,
    turnSpeed: 2.6,
  },
  mobil_keluarga: {
    name: 'Mobil Keluarga Avanza',
    category: 'mobil',
    maxSpeed: 36,
    accel: 15,
    turnSpeed: 2.1,
  },
  pickup: {
    name: 'Mobil Pickup L300',
    category: 'mobil',
    maxSpeed: 32,
    accel: 14,
    turnSpeed: 2.0,
  },
  truk: {
    name: 'Truk Semen Tuban',
    category: 'mobil',
    maxSpeed: 26,
    accel: 10,
    turnSpeed: 1.6,
  },
  bus: {
    name: 'Bus Pantura Tuban',
    category: 'mobil',
    maxSpeed: 34,
    accel: 11,
    turnSpeed: 1.4,
  },
  sepeda: {
    name: 'Sepeda Onthel Klasik',
    category: 'sepeda',
    maxSpeed: 14,
    accel: 12,
    turnSpeed: 3.1,
  },
};

export const OUTFIT_LABELS: Record<OutfitId, LocalizedText> = {
  kasual: {
    ngoko: 'Kaos Santai Ronggolawe',
    krama: 'Rasukan Santai Ronggolawe',
    indonesia: 'Kaos Santai Ronggolawe',
  },
  batik: {
    ngoko: 'Klambi Batik Gedog Tuban',
    krama: 'Ageman Bathik Gedhog Tuban',
    indonesia: 'Kemeja Batik Gedog Tuban',
  },
  jaket_motor: {
    ngoko: 'Jaket Touring Pantura',
    krama: 'Jaket Touring Pantura',
    indonesia: 'Jaket Touring Pantura',
  },
  lurik: {
    ngoko: 'Beskap Kadipaten Tuban',
    krama: 'Ageman Kadipaten Tuban',
    indonesia: 'Baju Adat Kadipaten Tuban',
  },
};

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'sega_pecel',
    name: {
      ngoko: 'Sego Jagung & Iwak Asin',
      krama: 'Sekul Jagung & Ulam Asin',
      indonesia: 'Nasi Jagung & Ikan Asin Tuban',
    },
    category: 'makanan',
    quantity: 2,
    healAmount: 35,
    staminaAmount: 40,
    description: {
      ngoko: 'Sego jagung khas pedesaan Tuban nganggo urap lan iwak asin. Nambah tenaga!',
      krama: 'Sekul jagung khas dhusun Tuban mawi urap lan ulam asin. Nambah karosan!',
      indonesia: 'Nasi jagung khas pedesaan Tuban dengan urap dan ikan asin. Memulihkan energi!',
    },
  },
  {
    id: 'kopi_tubruk',
    name: {
      ngoko: 'Kopi Cethe Tuban',
      krama: 'Kopi Cethe Tuban',
      indonesia: 'Kopi Cethe Khas Tuban',
    },
    category: 'makanan',
    quantity: 1,
    healAmount: 15,
    staminaAmount: 60,
    description: {
      ngoko: 'Kopi ireng kenthel khas warung Tuban gaweane Mbah Darto, langsung melek!',
      krama: 'Kopi cemeng kenthel khas wande Tuban damelanipun Mbah Darto, seger malih.',
      indonesia: 'Kopi hitam kental khas warung Tuban buatan Mbah Darto, memulihkan stamina!',
    },
  },
];

export const SHOPS: Record<
  string,
  {
    id: string;
    title: LocalizedText;
    keeper: string;
    greeting: LocalizedText;
    items: ShopItem[];
  }
> = {
  warung_desa: {
    id: 'warung_desa',
    title: {
      ngoko: 'Warung Legen & Kopi Mbah Darto',
      krama: 'Wande Legen & Kopi Mbah Darto',
      indonesia: 'Warung Legen & Kopi Mbah Darto',
    },
    keeper: 'Mbah Darto',
    greeting: {
      ngoko: 'Monggo Mas Bagas, mampir ngombe es legen siwalan utawa ngopi cethe dhisik!',
      krama: 'Sumangga Mas Bagas, pinarak ngunjuk legen siwalan utawi kopi rumiyin!',
      indonesia: 'Silakan Mas Bagas, mampir minum es legen siwalan atau ngopi dulu!',
    },
    items: [
      {
        id: 'kopi_tubruk',
        name: { ngoko: 'Kopi Cethe Anget', krama: 'Kopi Cethe Benter', indonesia: 'Kopi Cethe Hangat' },
        category: 'makanan',
        price: 5000,
        healAmount: 15,
        staminaAmount: 60,
        description: {
          ngoko: 'Kopi ireng kenthel khas warung Tuban.',
          krama: 'Kopi cemeng kenthel khas Tuban.',
          indonesia: 'Kopi hitam kental khas warung Tuban.',
        },
      },
      {
        id: 'sega_pecel',
        name: { ngoko: 'Sego Jagung & Iwak Asin', krama: 'Sekul Jagung & Ulam Asin', indonesia: 'Nasi Jagung & Ikan Asin' },
        category: 'makanan',
        price: 12000,
        healAmount: 35,
        staminaAmount: 40,
        description: {
          ngoko: 'Wareg tenan nganggo sambel terasi lan peyek.',
          krama: 'Tuwuk sanget mawi sambel lan rempeyek.',
          indonesia: 'Mengenyangkan dengan sambal terasi khas Tuban.',
        },
      },
      {
        id: 'es_dawet',
        name: { ngoko: 'Es Legen Siwalan Tuban', krama: 'Es Legen Siwalan Tuban', indonesia: 'Es Legen Siwalan Asli Tuban' },
        category: 'makanan',
        price: 8000,
        healAmount: 25,
        staminaAmount: 55,
        description: {
          ngoko: 'Nira siwalan seger asli Tuban, adem manis pas awan panas.',
          krama: 'Nira siwalan seger asli Tuban, seger sanget wekdal siyang.',
          indonesia: 'Minuman nira siwalan segar khas Kabupaten Tuban.',
        },
      },
    ],
  },
  pasar_kota: {
    id: 'pasar_kota',
    title: {
      ngoko: 'Pasar Baru Tuban',
      krama: 'Peken Enggal Tuban',
      indonesia: 'Pasar Baru Tuban',
    },
    keeper: 'Yu Sri',
    greeting: {
      ngoko: 'Ayo Mas, tumbas blanjaan opo? Becek menthok, gula siwalan, sayur kabeh seger!',
      krama: 'Mangga Mas, mundhut blanjan punapa? Becek menthok, gendhis siwalan, sedaya seger!',
      indonesia: 'Ayo Mas, mau beli apa di Pasar Baru Tuban? Becek menthok, gula siwalan, semua segar!',
    },
    items: [
      {
        id: 'rawon_setan',
        name: { ngoko: 'Becek Menthok Khas Tuban', krama: 'Becek Menthok Khas Tuban', indonesia: 'Becek Menthok Khas Tuban' },
        category: 'makanan',
        price: 22000,
        healAmount: 65,
        staminaAmount: 60,
        description: {
          ngoko: 'Kuliner legendaris Tuban bumbu rempah pedes gurih.',
          krama: 'Dhaharan khas Tuban bumbu rempah pedes gurih.',
          indonesia: 'Kuliner legendaris Kabupaten Tuban berkuah rempah pedas gurih.',
        },
      },
      {
        id: 'paket_sembako',
        name: {
          ngoko: 'Paket Blanjaan Pasar Baru (Beras & Gula Siwalan)',
          krama: 'Paket Blanjan Peken Enggal (Uwos & Gendhis Siwalan)',
          indonesia: 'Paket Belanja Pasar Baru Tuban',
        },
        category: 'perlengkapan',
        price: 35000,
        description: {
          ngoko: 'Kebutuhan pawon kanggo Warung Legen Mbah Darto.',
          krama: 'Kabetahan pawon kangge Wande Mbah Darto.',
          indonesia: 'Kebutuhan dapur untuk Warung Legen Mbah Darto di Desa Kerek.',
        },
      },
      {
        id: 'sate_ayam',
        name: { ngoko: 'Garang Asem & Sate Tuban', krama: 'Garang Asem & Sate Tuban', indonesia: 'Garang Asem Khas Tuban' },
        category: 'makanan',
        price: 18000,
        healAmount: 50,
        staminaAmount: 45,
        description: {
          ngoko: 'Olahan seger khas jalur Pantura Tuban.',
          krama: 'Dhaharan seger khas Pantura Tuban.',
          indonesia: 'Hidangan hangat segar khas jalur Pantura Tuban.',
        },
      },
    ],
  },
  toko_klambi: {
    id: 'toko_klambi',
    title: {
      ngoko: 'Galeri Batik Gedog Kerek Tuban',
      krama: 'Galeri Bathik Gedhog Kerek Tuban',
      indonesia: 'Galeri Batik Gedog Kerek Tuban',
    },
    keeper: 'Mbak Ratna',
    greeting: {
      ngoko: 'Sugeng rawuh Mas Bagas! Monggo dipilih tenun Batik Gedog asli Kerek Tuban.',
      krama: 'Sugeng rawuh Mas Bagas! Sumangga dipun pilih tenun Bathik Gedhog asli Kerek Tuban.',
      indonesia: 'Selamat datang Mas Bagas! Silakan pilih tenun Batik Gedog asli Kerek Tuban.',
    },
    items: [
      {
        id: 'outfit_batik',
        name: { ngoko: 'Klambi Batik Gedog Tuban', krama: 'Ageman Bathik Gedhog Tuban', indonesia: 'Kemeja Batik Gedog Tuban' },
        category: 'pakaian',
        price: 65000,
        outfitId: 'batik',
        description: {
          ngoko: 'Tenun Batik Gedog motif Lokcan asli Kerek, cocok kanggo sowan Pendopo.',
          krama: 'Tenun Bathik Gedhog asli Kerek, trep kangge sowan Pendopo.',
          indonesia: 'Batik Gedog tenun asli Kerek Tuban, cocok untuk berkunjung ke Pendopo.',
        },
      },
      {
        id: 'outfit_jaket',
        name: { ngoko: 'Jaket Touring Pantura', krama: 'Jaket Touring Pantura', indonesia: 'Jaket Touring Pantura' },
        category: 'pakaian',
        price: 55000,
        outfitId: 'jaket_motor',
        description: {
          ngoko: 'Jaket tahan angin nek numpak motor menyang Air Terjun Nglirip.',
          krama: 'Jaket tahan angin menawi nitih motor dhateng Nglirip.',
          indonesia: 'Jaket tahan angin untuk touring menyusuri Pantura dan Bukit Kapur Nglirip.',
        },
      },
      {
        id: 'outfit_lurik',
        name: { ngoko: 'Beskap Kadipaten Tuban', krama: 'Ageman Kadipaten Tuban', indonesia: 'Baju Adat Kadipaten Tuban' },
        category: 'pakaian',
        price: 90000,
        outfitId: 'lurik',
        description: {
          ngoko: 'Pakaian adat Kadipaten Tuban gagah lan berwibawa.',
          krama: 'Ageman adat Kadipaten Tuban ingkang gagah lan wibawa.',
          indonesia: 'Pakaian adat Kadipaten Tuban yang gagah dan berwibawa.',
        },
      },
    ],
  },
  bengkel_kota: {
    id: 'bengkel_kota',
    title: {
      ngoko: 'Bengkel & Showroom Ronggolawe Tuban',
      krama: 'Bengkel & Showroom Ronggolawe Tuban',
      indonesia: 'Bengkel & Showroom Ronggolawe Tuban',
    },
    keeper: 'Mas Joko',
    greeting: {
      ngoko: 'Piye kabare Mas Bagas? Pengin nyoba motor sport opo mobil kanggo muteri Tuban?',
      krama: 'Kados pundi pawartanipun Mas Bagas? Karsa nyobi motor utawi mobil enggal?',
      indonesia: 'Apa kabar Mas Bagas? Mau pilih kendaraan baru untuk menjelajah Kabupaten Tuban?',
    },
    items: [
      {
        id: 'buy_motor_sport',
        name: { ngoko: 'Motor Sport Ninja', krama: 'Motor Sport Ninja', indonesia: 'Motor Sport Ninja' },
        category: 'kendaraan',
        price: 180000,
        vehicleType: 'motor_sport',
        description: {
          ngoko: 'Motor banter banget kanggo dalan Pantura Tuban lan tanjakan Nglirip.',
          krama: 'Motor kenceng sanget kangge margi Pantura Tuban.',
          indonesia: 'Motor sport kencang untuk jalur Pantura Tuban dan tanjakan Nglirip.',
        },
      },
      {
        id: 'buy_pickup',
        name: { ngoko: 'Mobil Pickup L300', krama: 'Mobil Pickup L300', indonesia: 'Mobil Pickup L300' },
        category: 'kendaraan',
        price: 240000,
        vehicleType: 'pickup',
        description: {
          ngoko: 'Kuat nggawa muatan hasil panen siwalan lan iwak nelayan Palang.',
          krama: 'Kiyat mbekta momotan asil panen lan ulam nelayan.',
          indonesia: 'Tangguh mengangkut hasil panen siwalan dan ikan nelayan Palang.',
        },
      },
      {
        id: 'buy_mobil_keluarga',
        name: { ngoko: 'Mobil Keluarga Avanza', krama: 'Mobil Keluarga Avanza', indonesia: 'Mobil Keluarga Avanza' },
        category: 'kendaraan',
        price: 320000,
        vehicleType: 'mobil_keluarga',
        description: {
          ngoko: 'Nyaman lan adem kanggo wisata keliling Bumi Wali Tuban.',
          krama: 'Sekeca lan asrep kangge wisata keliling Bumi Wali Tuban.',
          indonesia: 'Nyaman dan sejuk untuk berkeliling wisata Bumi Wali Tuban.',
        },
      },
    ],
  },
  warung_seafood: {
    id: 'warung_seafood',
    title: {
      ngoko: 'Warung Kare Rajungan Bu Wati (Pantura)',
      krama: 'Wande Kare Rajungan Bu Wati',
      indonesia: 'Warung Kare Rajungan Bu Wati Tuban',
    },
    keeper: 'Bu Wati',
    greeting: {
      ngoko: 'Kare rajungane nembe mateng, Mas! Asli tangkapan nelayan Pantai Boom & Palang.',
      krama: 'Kare rajunganipun nembe mateng, Mas! Asli tangkapan nelayan Pantai Boom.',
      indonesia: 'Kare rajungannya baru matang, Mas! Asli tangkapan nelayan Pantai Boom & Palang.',
    },
    items: [
      {
        id: 'iwak_bakar',
        name: { ngoko: 'Kare Rajungan Pedas Tuban', krama: 'Kare Rajungan Pedas Tuban', indonesia: 'Kare Rajungan Khas Tuban' },
        category: 'makanan',
        price: 25000,
        healAmount: 75,
        staminaAmount: 55,
        description: {
          ngoko: 'Kare rajungan pedes gurih, kuliner paling terkenal ing Tuban.',
          krama: 'Kare rajungan pedes gurih, dhaharan khas Tuban.',
          indonesia: 'Kare rajungan pedas gurih, kuliner paling ikonik di Kabupaten Tuban.',
        },
      },
      {
        id: 'es_degan',
        name: { ngoko: 'Es Siwalan & Degan Boom', krama: 'Es Siwalan & Degan Boom', indonesia: 'Es Siwalan & Kelapa Muda' },
        category: 'makanan',
        price: 10000,
        healAmount: 30,
        staminaAmount: 65,
        description: {
          ngoko: 'Buah ental siwalan campur es degan ing pinggir Pantai Boom.',
          krama: 'Buah siwalan campur es degan ing pinggir Pantai Boom.',
          indonesia: 'Buah siwalan segar dan kelapa muda di tepi Pantai Boom Tuban.',
        },
      },
    ],
  },
};

export const MISSIONS: MissionDef[] = [
  {
    id: 'misi_1_tangga',
    code: 'MISI 1',
    title: {
      ngoko: 'Nglayani Tangga Kerek',
      krama: 'Ngladosi Tangga Dhusun Kerek',
      indonesia: 'Membantu Tetangga Kerek',
    },
    giverNpcId: 'bu_siti',
    giverName: 'Bu Siti',
    region: 'desa',
    summary: {
      ngoko: 'Anterna besek selamatan saka omahe Bu Siti ing Desa Kerek menyang Balai Desa cedhak wit asem & siwalan.',
      krama: 'Aturaken besek slametan saking dalemipun Bu Siti ing Dhusun Kerek dhateng Bale Dhusun.',
      indonesia: 'Antarkan besek selamatan dari rumah Bu Siti di Desa Kerek ke Balai Desa dekat pohon asam besar.',
    },
    rewardMoney: 45000,
    rewardXp: 120,
    rewardRep: 15,
    startDialogue: {
      ngoko: 'Mas Bagas, tulung anterna besek selamatan iki menyang Pak Lurah ing Balai Desa Kerek. Lurus wae, terus belok kiwa cedhak wit asem gedhe!',
      krama: 'Mas Bagas, nyuwun tulung aturaken besek slametan punika dhateng Pak Lurah ing Bale Dhusun Kerek. Lurus kemawon, lajeng menggok kiwa!',
      indonesia: 'Mas Bagas, tolong antarkan besek selamatan ini ke Pak Lurah di Balai Desa Kerek. Lurus saja, lalu belok kiri dekat pohon asam besar!',
    },
    completeDialogue: {
      ngoko: 'Wah, matur nuwun sanget Le, Bagas! Iki dhuwit jajan lan titipan salam kanggo warga Kerek ya.',
      krama: 'Wah, matur nuwun sanget Mas Bagas! Punika arta jajan kaliyan salam kagem warga Kerek nggih.',
      indonesia: 'Wah, terima kasih banyak Nak Bagas! Ini uang jajan dan titip salam untuk Bu Siti ya.',
    },
    steps: [
      {
        id: 'm1_s1',
        title: {
          ngoko: 'Menyang Balai Desa Kerek',
          krama: 'Dhateng Bale Dhusun Kerek',
          indonesia: 'Menuju Balai Desa Kerek',
        },
        objective: {
          ngoko: 'Gawa besek menyang Balai Desa Kerek cedhak wit asem gedhe.',
          krama: 'Bektan besek dhateng Bale Dhusun Kerek celak wit asem ageng.',
          indonesia: 'Bawa besek ke Balai Desa Kerek dekat pohon asam besar.',
        },
        targetX: -52,
        targetZ: -38,
        targetRadius: 5,
        type: 'talk',
        targetNpcId: 'pak_lurah',
        waypointLabel: 'Balai Desa Kerek',
      },
    ],
  },
  {
    id: 'misi_2_kambing',
    code: 'MISI 2',
    title: {
      ngoko: 'Wedhus Ucul ing Kali Kening',
      krama: 'Menda Ucul ing Lepen Kening',
      indonesia: 'Mencari Kambing di Kali Kening',
    },
    giverNpcId: 'pak_karjo',
    giverName: 'Pak Karjo',
    region: 'desa',
    summary: {
      ngoko: 'Wedhus duweke Pak Karjo ucul menyang pinggir Kali Kening lan sawah kidul. Golekana banjur balikna menyang kandhang!',
      krama: 'Menda kagunganipun Pak Karjo ucul dhateng pinggir Lepen Kening lan sabin. Padosana lajeng wangsulaken!',
      indonesia: 'Kambing milik Pak Karjo lepas ke pinggir Kali Kening dan sawah. Temukan lalu kembalikan ke kandang!',
    },
    rewardMoney: 60000,
    rewardXp: 150,
    rewardRep: 20,
    startDialogue: {
      ngoko: 'Waduh Mas Bagas! Wedhusku sing putih ucul mau esuk, mlayune nyabrang jembatan Kali Kening menyang cedhak sawah kidul. Tulung golekana ya!',
      krama: 'Waduh Mas Bagas! Menda kula ingkang pethak ucul wau enjang, mlajengipun nyabrang kreteg Lepen Kening. Nyuwun tulung padosaken nggih!',
      indonesia: 'Waduh Mas Bagas! Kambing saya yang putih lepas tadi pagi, larinya menyeberang jembatan Kali Kening ke sawah selatan. Tolong carikan ya!',
    },
    completeDialogue: {
      ngoko: 'Alhamdulillah ketemu wedhusku! Matur suwun banget Mas Bagas, kowe pancen nom-noman Tuban sing tanggap!',
      krama: 'Alhamdulillah pinanggih menda kula! Matur nuwun sanget Mas Bagas, panjenengan pancen pemudha Tuban ingkang sae!',
      indonesia: 'Alhamdulillah kambing saya ketemu! Terima kasih banyak Mas Bagas, kamu memang pemuda Tuban yang sigap!',
    },
    steps: [
      {
        id: 'm2_s1',
        title: {
          ngoko: 'Temokna Wedhus ing Sawah Kali Kening',
          krama: 'Panggihaken Menda ing Sabin Lepen Kening',
          indonesia: 'Temukan Kambing di Sawah Kali Kening',
        },
        objective: {
          ngoko: 'Goleki wedhus putih sing mlayu ing pinggir sawah & Kali Kening.',
          krama: 'Padosi menda pethak ingkang mlajeng ing pinggir sabin & Lepen Kening.',
          indonesia: 'Cari kambing putih yang berkeliaran di pinggir sawah & Kali Kening.',
        },
        targetX: -95,
        targetZ: 74,
        targetRadius: 5,
        type: 'collect',
        waypointLabel: 'Wedhus Pak Karjo',
      },
      {
        id: 'm2_s2',
        title: {
          ngoko: 'Balikna menyang Pak Karjo',
          krama: 'Wangsulaken dhateng Pak Karjo',
          indonesia: 'Kembalikan ke Pak Karjo',
        },
        objective: {
          ngoko: 'Balik menyang Kandhang Peternakan lan ngomong karo Pak Karjo.',
          krama: 'Wangsul dhateng Kandhang Peternakan lan matur dhateng Pak Karjo.',
          indonesia: 'Kembali ke Kandang Peternakan dan bicara dengan Pak Karjo.',
        },
        targetX: -72,
        targetZ: 24,
        targetRadius: 5,
        type: 'talk',
        targetNpcId: 'pak_karjo',
        waypointLabel: 'Kandhang Pak Karjo',
      },
    ],
  },
  {
    id: 'misi_3_sekolah',
    code: 'MISI 3',
    title: {
      ngoko: 'Ngeterake Sekolah menyang Kota Tuban',
      krama: 'Ngateraken Sekolah dhateng Kitha Tuban',
      indonesia: 'Mengantar Sekolah ke Kota Tuban',
    },
    giverNpcId: 'dik_rino',
    giverName: 'Dik Rino',
    region: 'desa',
    summary: {
      ngoko: 'Dik Rino telat mangkat sekolah menyang SMAN 1 Tuban cedhak Alun-Alun. Goncengen nganggo sepeda motor!',
      krama: 'Dik Rino kantun bidhal sekolah dhateng Sekolah Kitha Tuban celak Alun-Alun. Goncengaken nitih motor!',
      indonesia: 'Dik Rino hampir terlambat sekolah ke Sekolah Kota Tuban dekat Alun-Alun. Bonceng dia naik motor!',
    },
    rewardMoney: 75000,
    rewardXp: 180,
    rewardRep: 20,
    startDialogue: {
      ngoko: 'Mas Bagas! Tulung goncengake aku menyang Sekolah ing Kota Tuban cedhak Alun-Alun, bel-e wis meh muni iki!',
      krama: 'Mas Bagas! Nyuwun tulung goncengaken kula dhateng Sekolah ing Kitha Tuban celak Alun-Alun!',
      indonesia: 'Mas Bagas! Tolong bonceng saya ke Sekolah Kota Tuban dekat Alun-Alun, belnya sudah mau berbunyi!',
    },
    completeDialogue: {
      ngoko: 'Asik, ora telat! Matur nuwun banget ya Mas Bagas, numpak motormu penak tenan!',
      krama: 'Asik, mboten telat! Matur nuwun sanget nggih Mas Bagas!',
      indonesia: 'Asik, tidak terlambat! Terima kasih banyak ya Mas Bagas, naik motormu nyaman sekali!',
    },
    steps: [
      {
        id: 'm3_s1',
        title: {
          ngoko: 'Numpak Motor Menyang Sekolah Kota Tuban',
          krama: 'Nitih Motor Dhateng Sekolah Kitha Tuban',
          indonesia: 'Naik Motor ke Sekolah Kota Tuban',
        },
        objective: {
          ngoko: 'Numpak kendaraan menyang Sekolah cedhak Alun-Alun Kota Tuban.',
          krama: 'Nitih kendaraan dhateng Sekolah celak Alun-Alun Kitha Tuban.',
          indonesia: 'Kendarai motor atau mobil menuju Sekolah dekat Alun-Alun Kota Tuban.',
        },
        targetX: 118,
        targetZ: -45,
        targetRadius: 7,
        type: 'escort_vehicle',
        requiredVehicleCategory: 'any',
        waypointLabel: 'Sekolah Kota Tuban',
      },
    ],
  },
  {
    id: 'misi_4_pasar',
    code: 'MISI 4',
    title: {
      ngoko: 'Kulakan ing Pasar Baru Tuban',
      krama: 'Mundhut ing Peken Enggal Tuban',
      indonesia: 'Belanja di Pasar Baru Tuban',
    },
    giverNpcId: 'mbah_darto',
    giverName: 'Mbah Darto',
    region: 'desa',
    summary: {
      ngoko: 'Mbah Darto kehabisan stok kopi lan gula siwalan. Jupuk Paket Blanjaan ing Pasar Baru Tuban banjur gawa balik menyang Warung!',
      krama: 'Mbah Darto telas stok kopi lan gendhis siwalan. Mundhut Paket Blanjan ing Peken Enggal Tuban!',
      indonesia: 'Mbah Darto kehabisan stok kopi dan gula siwalan. Ambil Paket Belanja di Pasar Baru Tuban lalu bawa ke Warung!',
    },
    rewardMoney: 95000,
    rewardXp: 200,
    rewardRep: 25,
    startDialogue: {
      ngoko: 'Le Bagas, stok kopiku karo gula siwalan neng warung entek. Tulung jupukno Paket Blanjaan ing Pasar Baru Tuban yo!',
      krama: 'Nak Bagas, stok kopi kaliyan gendhis siwalan wonten wande telas. Nyuwun tulung mundhutaken ing Peken Enggal Tuban!',
      indonesia: 'Nak Bagas, stok kopi dan gula siwalan di warung habis. Tolong belikan Paket Belanja di Pasar Baru Tuban ya!',
    },
    completeDialogue: {
      ngoko: 'Jos tenan! Saiki warung legen lan kopi iso bukak terus. Matur nuwun Bagas!',
      krama: 'Sae sanget! Sakmenika wande saged bikak terus. Matur nuwun Mas Bagas!',
      indonesia: 'Mantap! Sekarang warung legen dan kopi bisa buka terus. Terima kasih Bagas!',
    },
    steps: [
      {
        id: 'm4_s1',
        title: {
          ngoko: 'Menyang Pasar Baru Tuban',
          krama: 'Dhateng Peken Enggal Tuban',
          indonesia: 'Pergi ke Pasar Baru Tuban',
        },
        objective: {
          ngoko: 'Parani Yu Sri ing Pasar Baru Tuban kanggo jupuk bahan warung.',
          krama: 'Panggihi Yu Sri ing Peken Enggal Tuban kangge mundhut bahan wande.',
          indonesia: 'Temui Yu Sri di Pasar Baru Tuban untuk mengambil bahan dapur & gula siwalan.',
        },
        targetX: 145,
        targetZ: 28,
        targetRadius: 6,
        type: 'talk',
        targetNpcId: 'yu_sri',
        waypointLabel: 'Pasar Baru Tuban',
      },
      {
        id: 'm4_s2',
        title: {
          ngoko: 'Gawa Blanjaan menyang Warung Mbah Darto',
          krama: 'Bektan Blanjan dhateng Wande Mbah Darto',
          indonesia: 'Antar Belanjaan ke Warung Mbah Darto',
        },
        objective: {
          ngoko: 'Balik menyang Warung Legen & Kopi Mbah Darto ing Desa Kerek.',
          krama: 'Wangsul dhateng Wande Legen & Kopi Mbah Darto ing Dhusun Kerek.',
          indonesia: 'Kembali ke Warung Legen & Kopi Mbah Darto di Desa Kerek.',
        },
        targetX: 16,
        targetZ: 14,
        targetRadius: 5,
        type: 'talk',
        targetNpcId: 'mbah_darto',
        waypointLabel: 'Warung Mbah Darto',
      },
    ],
  },
  {
    id: 'misi_5_nelayan',
    code: 'MISI 5',
    title: {
      ngoko: 'Nolong Nelayan Pantai Boom',
      krama: 'Mbiyantu Nelayan Pantai Boom',
      indonesia: 'Menolong Nelayan Pantai Boom',
    },
    giverNpcId: 'pak_slamet',
    giverName: 'Pak Slamet',
    region: 'pesisir',
    summary: {
      ngoko: 'Pak Slamet nembe mentas njala rajungan lan iwak akeh. Gawa peti iwak saka Dermaga Pantai Boom menyang TPI Palang Tuban!',
      krama: 'Pak Slamet nembe mentas njala rajungan lan ulam kathah. Bekta peti ulam saking Dermaga Pantai Boom dhateng TPI!',
      indonesia: 'Pak Slamet baru mendarat di Pantai Boom dengan tangkapan rajungan & ikan melimpah. Bantu bawa peti ikan ke TPI Palang!',
    },
    rewardMoney: 110000,
    rewardXp: 240,
    rewardRep: 30,
    startDialogue: {
      ngoko: 'Wah Mas Bagas pas banget teka! Perahuku kebak rajungan karo iwak kakap. Tulung gawakna peti iwake saka Dermaga Pantai Boom menyang TPI ya!',
      krama: 'Wah Mas Bagas pas sanget rawuh! Prau kula kebak rajungan lan ulam kakap. Nyuwun tulung bektakaken dhateng TPI nggih!',
      indonesia: 'Wah Mas Bagas pas sekali datang! Perahuku penuh rajungan dan kakap. Tolong bawakan peti ikannya dari Dermaga Pantai Boom ke TPI!',
    },
    completeDialogue: {
      ngoko: 'Matur suwun banget Mas Bagas! Nek pengin kare rajungan seger, mampir warunge Bu Wati wae.',
      krama: 'Matur nuwun sanget Mas Bagas! Menawi karsa kare rajungan seger, pinarak dhateng wandenipun Bu Wati.',
      indonesia: 'Terima kasih banyak Mas Bagas! Kalau mau kare rajungan segar, langsung mampir warung Bu Wati ya.',
    },
    steps: [
      {
        id: 'm5_s1',
        title: {
          ngoko: 'Jupuk Peti Iwak ing Dermaga Pantai Boom',
          krama: 'Mundhut Peti Ulam ing Dermaga Pantai Boom',
          indonesia: 'Ambil Peti Ikan di Dermaga Pantai Boom',
        },
        objective: {
          ngoko: 'Parani prahu nelayan ing Dermaga Pantai Boom Tuban.',
          krama: 'Murugi prau nelayan ing Dermaga Pantai Boom Tuban.',
          indonesia: 'Datangi perahu nelayan di ujung Dermaga Pantai Boom Tuban.',
        },
        targetX: 110,
        targetZ: 196,
        targetRadius: 6,
        type: 'collect',
        waypointLabel: 'Dermaga Pantai Boom',
      },
      {
        id: 'm5_s2',
        title: {
          ngoko: 'Kirim menyang TPI Palang Tuban',
          krama: 'Kintun dhateng TPI Palang Tuban',
          indonesia: 'Antar ke TPI Palang Tuban',
        },
        objective: {
          ngoko: 'Gawa peti iwak menyang TPI lan lapor menyang Pak Slamet.',
          krama: 'Bekta peti ulam dhateng TPI lan lapor dhateng Pak Slamet.',
          indonesia: 'Bawa peti ikan ke TPI Palang dan serahkan kepada Pak Slamet.',
        },
        targetX: 78,
        targetZ: 162,
        targetRadius: 6,
        type: 'talk',
        targetNpcId: 'pak_slamet',
        waypointLabel: 'TPI Palang Tuban',
      },
    ],
  },
  {
    id: 'misi_6_wisata',
    code: 'MISI 6',
    title: {
      ngoko: 'Jelajah Bumi Wali Tuban',
      krama: 'Lelana ing Bumi Wali Tuban',
      indonesia: 'Jelajah Bumi Wali Tuban',
    },
    giverNpcId: 'pak_lurah',
    giverName: 'Pak Lurah',
    region: 'wisata',
    summary: {
      ngoko: 'Jelajahi telung ikon wisata alam lan sejarah Kabupaten Tuban: Air Terjun Nglirip, Gapura Paduraksa, lan Sendang Bektiharjo!',
      krama: 'Tliti tigang ikon wisata alam lan sejarah Kabupaten Tuban: Grojogan Nglirip, Gapura Paduraksa, lan Sendang Bektiharjo!',
      indonesia: 'Jelajahi tiga ikon alam & sejarah Kabupaten Tuban: Air Terjun Nglirip, Gapura Paduraksa, dan Sendang Bektiharjo!',
    },
    rewardMoney: 160000,
    rewardXp: 350,
    rewardRep: 50,
    startDialogue: {
      ngoko: 'Bagas, minangka putra Tuban kudu ngerti kaendahan Bumi Wali. Coba parani Air Terjun Nglirip, Gapura Paduraksa, karo Sendang Bektiharjo!',
      krama: 'Bagas, minangka putra Tuban kedah mangertos kaendahan Bumi Wali. Cobi panggihi Grojogan Nglirip, Gapura Paduraksa, lan Sendang Bektiharjo!',
      indonesia: 'Bagas, sebagai putra Tuban kamu harus mengenal pesona Bumi Wali. Kunjungi Air Terjun Nglirip, Gapura Paduraksa, dan Sendang Bektiharjo!',
    },
    completeDialogue: {
      ngoko: 'Luar biasa Mas Bagas! Saiki kowe resmi dadi Sang Petualang Bumi Wali Tuban sing sejati!',
      krama: 'Luar biasa Mas Bagas! Sakmenika panjenengan resmi dados Sang Petualang Bumi Wali Tuban ingkang sejatos!',
      indonesia: 'Luar biasa Mas Bagas! Sekarang kamu resmi menjadi Sang Petualang Bumi Wali Tuban sejati!',
    },
    steps: [
      {
        id: 'm6_s1',
        title: {
          ngoko: 'Tekan Air Terjun Nglirip (Singgahan)',
          krama: 'Dumugi Grojogan Nglirip (Singgahan)',
          indonesia: 'Kunjungi Air Terjun Nglirip',
        },
        objective: {
          ngoko: 'Tunggangi dalan munggah menyang Air Terjun Nglirip ing Bukit Kapur.',
          krama: 'Nitih margi minggah dhateng Grojogan Nglirip ing Redi Kapur.',
          indonesia: 'Naiki jalan pegunungan kapur menuju Air Terjun Nglirip (Singgahan).',
        },
        targetX: -70,
        targetZ: -176,
        targetRadius: 9,
        type: 'goto',
        waypointLabel: 'Air Terjun Nglirip',
      },
      {
        id: 'm6_s2',
        title: {
          ngoko: 'Ziarah menyang Gapura Paduraksa & Petilasan',
          krama: 'Ziarah dhateng Gapura Paduraksa & Petilasan',
          indonesia: 'Kunjungi Gapura Paduraksa Ronggolawe',
        },
        objective: {
          ngoko: 'Menyang kawasan wisata sejarah Gapura Paduraksa ing sisih kidul-kulon.',
          krama: 'Dhateng kawasan wisata sejarah Gapura Paduraksa ing sisih kidul-kilen.',
          indonesia: 'Menuju kawasan wisata sejarah Gapura Paduraksa di sisi barat daya.',
        },
        targetX: -140,
        targetZ: 145,
        targetRadius: 9,
        type: 'goto',
        waypointLabel: 'Gapura Paduraksa',
      },
      {
        id: 'm6_s3',
        title: {
          ngoko: 'Nikmati Sendang Bektiharjo & Goa Akbar',
          krama: 'Ngraosaken Sendang Bektiharjo & Guwa Akbar',
          indonesia: 'Kunjungi Sendang Bektiharjo & Goa',
        },
        objective: {
          ngoko: 'Parani tepi Sendang Bektiharjo lan Goa Kapur kanggo ngrampungake petualangan.',
          krama: 'Murugi pinggir Sendang Bektiharjo lan Guwa Kapur kangge ngrampungaken lelahanan.',
          indonesia: 'Datangi tepi Sendang Bektiharjo & Goa Kapur untuk menyelesaikan petualangan.',
        },
        targetX: -95,
        targetZ: 185,
        targetRadius: 10,
        type: 'goto',
        waypointLabel: 'Sendang Bektiharjo',
      },
    ],
  },
];

export const UI_STRINGS = {
  newGame: { ngoko: 'Mulai Anyar', krama: 'Wiwit Enggal', indonesia: 'Permainan Baru' },
  continueGame: { ngoko: 'Terusake', krama: 'Lajengaken', indonesia: 'Lanjutkan' },
  settings: { ngoko: 'Setelan', krama: 'Pangaturan', indonesia: 'Pengaturan' },
  saveGame: { ngoko: 'Simpen Game', krama: 'Simpen Game', indonesia: 'Simpan Game' },
  resume: { ngoko: 'Balik Main', krama: 'Wangsul Main', indonesia: 'Lanjut Bermain' },
  backToMenu: { ngoko: 'Menu Utama', krama: 'Menu Utama', indonesia: 'Menu Utama' },
  language: { ngoko: 'Basa', krama: 'Basa', indonesia: 'Bahasa' },
  health: { ngoko: 'Waras', krama: 'Saras', indonesia: 'Kesehatan' },
  stamina: { ngoko: 'Tenaga', krama: 'Karosan', indonesia: 'Stamina' },
  reputation: { ngoko: 'Jeneng Apik', krama: 'Asma Sae', indonesia: 'Reputasi' },
  inventory: { ngoko: 'Tas Gawan', krama: 'Tas Bektan', indonesia: 'Inventaris' },
  missions: { ngoko: 'Daftar Misi', krama: 'Pratelan Ayahan', indonesia: 'Daftar Misi' },
  wardrobe: { ngoko: 'Ganti Klambi', krama: 'Gantos Ageman', indonesia: 'Ganti Pakaian' },
  weather: { ngoko: 'Cuaca', krama: 'Cuaca', indonesia: 'Cuaca' },
  clear: { ngoko: 'Cerah', krama: 'Padhang', indonesia: 'Cerah' },
  rain: { ngoko: 'Udan', krama: 'Jawah', indonesia: 'Hujan' },
  interactHint: { ngoko: 'Pencet E kanggo interaksi', krama: 'Pencet E kangge sesambetan', indonesia: 'Tekan E untuk interaksi' },
  enterVehicle: { ngoko: 'Numpak (F)', krama: 'Nitih (F)', indonesia: 'Naik (F)' },
  exitVehicle: { ngoko: 'Mudhun (F)', krama: 'Mandhap (F)', indonesia: 'Turun (F)' },
};
