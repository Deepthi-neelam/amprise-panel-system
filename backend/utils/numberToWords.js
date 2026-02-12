/**
 * AMPRISE PANELS - Convert Numbers to Words
 * Indian Numbering System (Crore, Lakh, Thousand)
 */

function numberToWords(num) {
    if (num === 0) return 'Zero';
    if (!num || isNaN(num)) return '';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertHundreds(n) {
        let result = '';
        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n >= 10) {
            result += teens[n - 10] + ' ';
            n = 0;
        }
        if (n > 0) {
            result += ones[n] + ' ';
        }
        return result.trim();
    }
    
    let result = '';
    let number = Math.round(num);
    
    // Crores
    if (number >= 10000000) {
        const crore = Math.floor(number / 10000000);
        result += convertHundreds(crore) + ' Crore ';
        number %= 10000000;
    }
    
    // Lakhs
    if (number >= 100000) {
        const lakh = Math.floor(number / 100000);
        result += convertHundreds(lakh) + ' Lakh ';
        number %= 100000;
    }
    
    // Thousands
    if (number >= 1000) {
        const thousand = Math.floor(number / 1000);
        result += convertHundreds(thousand) + ' Thousand ';
        number %= 1000;
    }
    
    // Hundreds and below
    result += convertHundreds(number);
    
    return result.trim() + ' Rupees';
}

module.exports = numberToWords;