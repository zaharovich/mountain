const TEST_DATA = {
    cities: [
        { name: "Харків", id: "1" },
        { name: "Львів", id: "2" },
        { name: "Київ", id: "3" }
    ],
    
    shops: [
        {
            id: "1380",
            name: "Магазин \"Смак\" на вул. Тернопільська",
            map: "https://www.google.com/maps/place/50.0056,36.2345",
            products: [
                { id: "130", timestamp: "2025-01-10" },
                { id: "174", timestamp: "2025-01-08" }
            ]
        },
        {
            id: "1381",
            name: "Лавка здоров'я на проспекті Гагаріна",
            map: "https://www.google.com/maps/place/50.0105,36.2456",
            products: [
                { id: "130", timestamp: "2025-01-11" },
                { id: "182", timestamp: "2025-01-09" }
            ]
        },
        {
            id: "1382",
            name: "Органіка маркет на вул. Совєцькій",
            map: "https://www.google.com/maps/place/50.0045,36.2234",
            products: [
                { id: "174", timestamp: "2024-11-01" },
                { id: "182", timestamp: "2024-11-15" }
            ]
        },
        {
            id: "1383",
            name: "Супермаркет \"Родина\" на вул. Червоні Казарми",
            map: "https://www.google.com/maps/place/50.0200,36.2500",
            products: [
                { id: "130", timestamp: "2025-01-12" }
            ]
        },
        {
            id: "1384",
            name: "Крамниця біо-продуктів на вул. Шевченка",
            map: "https://www.google.com/maps/place/49.9945,36.2345",
            products: [
                { id: "182", timestamp: "2025-01-05" },
                { id: "174", timestamp: "2024-12-25" }
            ]
        }
    ],
    
    products: [
        {
            id: "130",
            title: "Горішки"
        },
        {
            id: "174",
            title: "Морозиво веган"
        },
        {
            id: "182",
            title: "Прянеспеченя"
        }
    ]
};

function generateTestEncryptedData() {
    const encrypted = encryptData(TEST_DATA);
    const payload = {
        data: encrypted,
        timestamp: new Date().toISOString()
    };
    
    return payload;
}

function testDecryption() {
    const encrypted = encryptData(TEST_DATA);
    
    const decrypted = decryptData(encrypted);
    
    const match = JSON.stringify(decrypted) === JSON.stringify(TEST_DATA);
    
    return match;
}
