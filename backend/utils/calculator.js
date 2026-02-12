/**
 * AMPRISE PANELS - Cost Calculation Engine
 * Professional estimation algorithms
 */

/**
 * Calculate BOM items and costs based on panel configuration
 */
function calculateBOM(panelType, feederCount, motorCount, panelSize, busbarType, brandPreference, ipRating, panelLevels = [], customComponents = []) {
    const bomItems = [];
    
    // For multi-level panel, calculate based on levels
    if (panelType === 'multi' && panelLevels && panelLevels.length > 0) {
        panelLevels.forEach(level => {
            const levelBom = generateLevelBOM(level.type, level.feederCount, level.motorCount, busbarType, brandPreference, panelSize, ipRating);
            bomItems.push(...levelBom);
        });
    } else {
        // For single panel or custom panel
        if (panelType === 'custom') {
            // Add custom components
            customComponents.forEach(comp => {
                bomItems.push({
                    name: comp.name,
                    category: comp.category,
                    brand: comp.brand,
                    specifications: comp.specifications,
                    quantity: comp.quantity,
                    unit_price: comp.unit_price,
                    unit: 'Pcs'
                });
            });
        } else {
            // Generate standard panel BOM
            const standardBom = generateStandardBOM(panelType, feederCount, motorCount, busbarType, brandPreference, panelSize, ipRating);
            bomItems.push(...standardBom);
        }
    }
    
    // Add common components based on panel size
    addCommonComponents(bomItems, panelSize, ipRating, feederCount, motorCount);
    
    return bomItems;
}

/**
 * Generate BOM for standard panel types
 */
function generateStandardBOM(panelType, feederCount, motorCount, busbarType, brandPreference, panelSize, ipRating) {
    const bomItems = [];
    
    // Component database with prices (realistic industry prices)
    const componentPrices = {
        // Enclosures
        'ENC-600': 15000,
        'ENC-800': 18000,
        'ENC-1000': 22000,
        'ENC-1500': 35000,
        'ENC-1600': 45000,
        'ENC-2100': 75000,
        
        // Circuit Breakers
        'MCCB-630': 8500,
        'MCCB-250': 6500,
        'MCB-32': 850,
        'MCB-63': 3200,
        
        // Contactors
        'CON-25': 1800,
        'CON-40': 2500,
        'CON-100': 5800,
        
        // Protection
        'OL-25': 2200,
        'OL-40': 2800,
        'MP-25': 4500,
        
        // Busbars
        'BUS-CU-630': 12000,
        'BUS-AL-630': 8000,
        'BUS-CU-800': 15000,
        'BUS-CU-1000': 20000,
        
        // Controllers
        'APFC-CTRL': 12000,
        'PLC-BASIC': 18000,
        'VFD-22KW': 25000,
        
        // Capacitors
        'CAP-25': 8500,
        'CAP-15': 6500,
        'CAP-50': 12000,
        
        // Meters
        'MTR-MULTI': 8500,
        'MTR-ENERGY': 6500,
        'MTR-POWER': 4500,
        
        // CTs
        'CT-600': 1800,
        'CT-800': 2500,
        'CT-SET': 7500,
        
        // Accessories
        'TB-10': 45,
        'WIRE-1.5': 85,
        'WIRE-2.5': 120,
        'WIRE-4.0': 180,
        'LAMP-LED': 280,
        'PB-22': 320,
        'SELECTOR': 450
    };
    
    // Enclosure based on size
    let enclosureKey = 'ENC-800'; // Default
    let enclosurePrice = 18000;
    
    if (panelSize === '600x600x200') {
        enclosureKey = 'ENC-600';
        enclosurePrice = componentPrices['ENC-600'];
    } else if (panelSize === '1000x1000x400') {
        enclosureKey = 'ENC-1000';
        enclosurePrice = componentPrices['ENC-1000'];
    } else if (panelSize === '1500x1000x400') {
        enclosureKey = 'ENC-1500';
        enclosurePrice = componentPrices['ENC-1500'];
    } else if (panelSize === '1600x1700x600') {
        enclosureKey = 'ENC-1600';
        enclosurePrice = componentPrices['ENC-1600'];
    } else if (panelSize === '2100x2900x1000') {
        enclosureKey = 'ENC-2100';
        enclosurePrice = componentPrices['ENC-2100'];
    }
    
    // Add enclosure
    bomItems.push({
        name: `Enclosure ${ipRating} ${panelSize}`,
        category: 'Enclosure',
        brand: 'Standard',
        specifications: `1.6mm CRCA, Indoor Type, ${ipRating}`,
        quantity: 1,
        unit_price: enclosurePrice,
        unit: 'Pcs'
    });
    
    // Incomer Section based on panel type
    switch(panelType) {
        case 'APFC':
            bomItems.push({
                name: 'APFC Controller',
                category: 'Controller',
                brand: brandPreference,
                specifications: 'Digital, 12 Step, RS485',
                quantity: 1,
                unit_price: componentPrices['APFC-CTRL'],
                unit: 'Pcs'
            });
            
            // Add capacitors based on panel size
            if (panelSize === '2100x2900x1000') {
                bomItems.push({
                    name: 'Capacitor 50kVAR',
                    category: 'Capacitor',
                    brand: 'Standard',
                    specifications: '50kVAR, 440V, Dry Type',
                    quantity: 8,
                    unit_price: componentPrices['CAP-50'],
                    unit: 'Pcs'
                });
            } else {
                bomItems.push({
                    name: 'Capacitor 25kVAR',
                    category: 'Capacitor',
                    brand: 'Standard',
                    specifications: '25kVAR, 440V, Dry Type',
                    quantity: Math.max(2, Math.ceil(feederCount/3)),
                    unit_price: componentPrices['CAP-25'],
                    unit: 'Pcs'
                });
            }
            break;
            
        case 'VFD':
            bomItems.push({
                name: 'VFD 22kW',
                category: 'Controller',
                brand: brandPreference,
                specifications: '22kW, 415V, 3P, IP55',
                quantity: Math.max(1, motorCount),
                unit_price: componentPrices['VFD-22KW'],
                unit: 'Pcs'
            });
            break;
            
        case 'PLC':
            bomItems.push({
                name: 'PLC Basic Unit',
                category: 'Controller',
                brand: brandPreference,
                specifications: '24VDC, 14DI/10DO',
                quantity: 1,
                unit_price: componentPrices['PLC-BASIC'],
                unit: 'Pcs'
            });
            break;
    }
    
    // Main Incomer
    let mccbSize = 'MCCB-630';
    let mccbPrice = componentPrices['MCCB-630'];
    
    if (panelType === 'PCC' || panelSize === '2100x2900x1000') {
        mccbSize = 'MCCB-250';
        mccbPrice = componentPrices['MCCB-250'];
    }
    
    bomItems.push({
        name: `MCCB ${mccbSize === 'MCCB-630' ? '630A' : '250A'}`,
        category: 'Circuit Breaker',
        brand: brandPreference,
        specifications: mccbSize === 'MCCB-630' ? '630A, 415V, 4P, 65kA' : '250A, 415V, 3P, 50kA',
        quantity: 1,
        unit_price: mccbPrice,
        unit: 'Pcs'
    });
    
    // Busbar
    let busbarKey = 'BUS-CU-630';
    let busbarPrice = componentPrices['BUS-CU-630'];
    
    if (panelSize === '1600x1700x600') {
        busbarKey = 'BUS-CU-800';
        busbarPrice = componentPrices['BUS-CU-800'];
    } else if (panelSize === '2100x2900x1000') {
        busbarKey = 'BUS-CU-1000';
        busbarPrice = componentPrices['BUS-CU-1000'];
    }
    
    if (busbarType === 'aluminum') {
        busbarKey = busbarKey.replace('CU', 'AL');
        busbarPrice = componentPrices[busbarKey] || componentPrices['BUS-AL-630'];
    }
    
    bomItems.push({
        name: `${busbarType === 'copper' ? 'Copper' : 'Aluminum'} Busbar Set`,
        category: 'Busbar',
        brand: 'Standard',
        specifications: `${busbarKey.split('-').pop()}A, 4P`,
        quantity: 1,
        unit_price: busbarPrice,
        unit: 'Set'
    });
    
    // Metering for larger panels
    if (panelSize === '1600x1700x600' || panelSize === '2100x2900x1000') {
        bomItems.push({
            name: 'Multi-function Meter',
            category: 'Meter',
            brand: brandPreference,
            specifications: '3 Phase, 4 Wire, RS485',
            quantity: 1,
            unit_price: componentPrices['MTR-MULTI'],
            unit: 'Pcs'
        });
        
        bomItems.push({
            name: 'CT Set (3P+1N)',
            category: 'Instrument',
            brand: 'Standard',
            specifications: '3 Phase + Neutral, 600/5A',
            quantity: 1,
            unit_price: componentPrices['CT-SET'],
            unit: 'Set'
        });
    }
    
    // Outgoing Section - Feeders
    const mccbCount = Math.ceil(feederCount * 0.4);
    const mcbCount = feederCount - mccbCount;
    
    if (mccbCount > 0) {
        bomItems.push({
            name: 'MCB 63A',
            category: 'Circuit Breaker',
            brand: brandPreference,
            specifications: '63A, 415V, 3P, 10kA',
            quantity: mccbCount,
            unit_price: componentPrices['MCB-63'],
            unit: 'Pcs'
        });
    }
    
    if (mcbCount > 0) {
        bomItems.push({
            name: 'MCB 32A',
            category: 'Circuit Breaker',
            brand: brandPreference,
            specifications: '32A, 240V, SPN, 10kA',
            quantity: mcbCount,
            unit_price: componentPrices['MCB-32'],
            unit: 'Pcs'
        });
    }
    
    // Motor Control Components
    if (motorCount > 0) {
        const contactorSize = motorCount <= 5 ? 'CON-25' : 'CON-40';
        const overloadSize = motorCount <= 5 ? 'OL-25' : 'OL-40';
        
        bomItems.push({
            name: `Contactor ${motorCount <= 5 ? '25A' : '40A'}`,
            category: 'Contactor',
            brand: brandPreference,
            specifications: `${motorCount <= 5 ? '25A' : '40A'}, 415V, 3P, AC3`,
            quantity: motorCount,
            unit_price: componentPrices[contactorSize],
            unit: 'Pcs'
        });
        
        bomItems.push({
            name: `Overload Relay ${motorCount <= 5 ? '18-25A' : '30-40A'}`,
            category: 'Protection',
            brand: brandPreference,
            specifications: `${motorCount <= 5 ? '18-25A' : '30-40A'}, Adjustable, Thermal`,
            quantity: motorCount,
            unit_price: componentPrices[overloadSize],
            unit: 'Pcs'
        });
    }
    
    return bomItems;
}

/**
 * Generate BOM for multi-level panel
 */
function generateLevelBOM(levelType, feederCount, motorCount, busbarType, brandPreference, panelSize, ipRating) {
    const levelBom = generateStandardBOM(levelType, feederCount, motorCount, busbarType, brandPreference, panelSize, ipRating);
    
    levelBom.forEach(item => {
        item.name = `${levelType} Level - ${item.name}`;
    });
    
    return levelBom;
}

/**
 * Add common components (wires, terminals, accessories)
 */
function addCommonComponents(bomItems, panelSize, ipRating, feederCount, motorCount) {
    const componentPrices = {
        'TB-10': 45,
        'WIRE-1.5': 85,
        'WIRE-2.5': 120,
        'WIRE-4.0': 180,
        'LAMP-LED': 280,
        'PB-22': 320,
        'SELECTOR': 450
    };
    
    // Terminal Blocks
    const terminalBlocksNeeded = (feederCount * 6) + (motorCount * 8) + 20;
    bomItems.push({
        name: 'Terminal Block',
        category: 'Accessory',
        brand: 'Phoenix',
        specifications: '10A, 600V, Screw Type',
        quantity: terminalBlocksNeeded,
        unit_price: componentPrices['TB-10'],
        unit: 'Pcs'
    });
    
    // Power Wiring
    let wireSize = '1.5';
    let wirePriceKey = 'WIRE-1.5';
    
    if (panelSize === '1600x1700x600') {
        wireSize = '2.5';
        wirePriceKey = 'WIRE-2.5';
    } else if (panelSize === '2100x2900x1000') {
        wireSize = '4.0';
        wirePriceKey = 'WIRE-4.0';
    }
    
    const wiringLength = 150 + (feederCount * 10) + (motorCount * 15);
    bomItems.push({
        name: `FRLS Wire ${wireSize}sqmm`,
        category: 'Accessory',
        brand: 'Finolex',
        specifications: `${wireSize}sqmm, FRLS, Copper`,
        quantity: wiringLength,
        unit_price: componentPrices[wirePriceKey],
        unit: 'Meter'
    });
    
    // Control Wiring
    const controlWiringLength = 50 + (feederCount * 5) + (motorCount * 10);
    bomItems.push({
        name: 'FRLS Wire 1.5sqmm',
        category: 'Accessory',
        brand: 'Finolex',
        specifications: '1.5sqmm, FRLS, Copper',
        quantity: controlWiringLength,
        unit_price: componentPrices['WIRE-1.5'],
        unit: 'Meter'
    });
    
    // Indication Lamps
    const lampCount = 6 + Math.ceil(feederCount/4) + motorCount;
    bomItems.push({
        name: 'Indication Lamp LED',
        category: 'Accessory',
        brand: 'Legrand',
        specifications: 'LED, 220V, 22mm',
        quantity: lampCount,
        unit_price: componentPrices['LAMP-LED'],
        unit: 'Pcs'
    });
    
    // Push Buttons
    const pbCount = motorCount * 2 + 2;
    bomItems.push({
        name: 'Push Button 22mm',
        category: 'Accessory',
        brand: 'Legrand',
        specifications: '22mm, IP55, Red/Green',
        quantity: pbCount,
        unit_price: componentPrices['PB-22'],
        unit: 'Pcs'
    });
    
    // Selector Switches
    if (motorCount > 0) {
        bomItems.push({
            name: 'Selector Switch',
            category: 'Accessory',
            brand: 'Schneider',
            specifications: '22mm, 3 Position, IP55',
            quantity: motorCount,
            unit_price: componentPrices['SELECTOR'],
            unit: 'Pcs'
        });
    }
}

/**
 * Calculate all costs from BOM items
 */
function calculateCosts(bomItems) {
    let materialCost = 0;
    bomItems.forEach(item => {
        materialCost += (item.quantity * item.unit_price);
    });
    
    // Production costs
    const powderCoatingCost = materialCost * 0.03;
    const labourCost = materialCost * 0.20;
    const wiringCost = materialCost * 0.15;
    const testingCost = materialCost * 0.05;
    const productionCost = powderCoatingCost + labourCost + wiringCost + testingCost;
    
    const totalCost = materialCost + productionCost;
    const profitMargin = 20;
    const priceBeforeGST = totalCost * (1 + profitMargin/100);
    const gstPercentage = 18;
    const gstAmount = priceBeforeGST * (gstPercentage/100);
    const finalAmount = priceBeforeGST + gstAmount;
    
    return {
        materialCost: parseFloat(materialCost.toFixed(2)),
        productionCost: parseFloat(productionCost.toFixed(2)),
        powderCoatingCost: parseFloat(powderCoatingCost.toFixed(2)),
        labourCost: parseFloat(labourCost.toFixed(2)),
        wiringCost: parseFloat(wiringCost.toFixed(2)),
        testingCost: parseFloat(testingCost.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        profitMargin: profitMargin,
        priceBeforeGST: parseFloat(priceBeforeGST.toFixed(2)),
        gstPercentage: gstPercentage,
        gstAmount: parseFloat(gstAmount.toFixed(2)),
        finalAmount: parseFloat(finalAmount.toFixed(2))
    };
}

module.exports = {
    calculateBOM,
    generateStandardBOM,
    generateLevelBOM,
    addCommonComponents,
    calculateCosts
};