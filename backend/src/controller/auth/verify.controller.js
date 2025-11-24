const User = require("../../models/User.model");
const VerificationRequest = require("../../models/VerificationRequest.model");
const { getAdmin } = require("../../config/firebase");
const { uploadToCloudinary } = require('../../middleware/upload.middleware');
const { createNotification } = require("../../middleware/createNotification");

let Tesseract;
let tesseractLoaded = false;
const loadTesseract = async () => {
    if (!tesseractLoaded) {
        try {
            Tesseract = require('tesseract.js');
            tesseractLoaded = true;
        } catch (error) {
            Tesseract = null;
            tesseractLoaded = true;
        }
    }
    return Tesseract;
};

let sharp;
const loadSharp = async () => {
    if (!sharp) {
        try {
            sharp = require('sharp');
        } catch (error) {
            sharp = null;
        }
    }
    return sharp;
};

const initFetch = async () => {
    if (typeof globalThis.fetch !== "undefined") {
        return globalThis.fetch;
    } else if (typeof fetch !== "undefined") {
        return fetch;
    } else {
        throw new Error('fetch is not available. Please use Node.js 18 or higher.');
    }
};

const validateVietnamesePhoneNumber = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, '');
    const mobilePattern = /^(09|08|07|05|03)[0-9]{8}$/;
    const landlinePattern = /^02[0-9]{8,9}$/;
    return mobilePattern.test(digits) || landlinePattern.test(digits);
};

const formatPhoneNumber = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        return digits;
    }
    if (digits.startsWith('84')) {
        return '0' + digits.substring(2);
    }
    if (phoneNumber.startsWith('+84')) {
        return '0' + digits.substring(2);
    }
    return digits;
};

const preprocessImageForOCR = async (imageBuffer) => {
    try {
        const sharpLib = await loadSharp();
        if (!sharpLib) {
            return imageBuffer;
        }

        let metadata;
        try {
            metadata = await sharpLib(imageBuffer).metadata();
        } catch (metaError) {
            metadata = { width: 1000, height: 1000 };
        }

        let processedBuffer;
        try {
            let pipeline = sharpLib(imageBuffer);
            if (metadata.width && metadata.width < 2500) {
                pipeline = pipeline.resize(2500, null, {
                    withoutEnlargement: false,
                    fit: 'inside',
                    kernel: sharpLib.kernel.lanczos3
                });
            }
            processedBuffer = await pipeline
                .greyscale()
                .normalize()
                .sharpen({ sigma: 2, flat: 1, jagged: 3 })
                .modulate({ brightness: 1.15, saturation: 0 })
                .linear(1.3, -(128 * 0.3))
                .threshold(128, { grayscale: true })
                .png({ quality: 100, compressionLevel: 0 })
                .toBuffer();
            return processedBuffer;
        } catch (processError) {
            console.error('Error during image processing:', processError);
            try {
                processedBuffer = await sharpLib(imageBuffer)
                    .greyscale()
                    .normalize()
                    .png({ quality: 100 })
                    .toBuffer();
                return processedBuffer;
            } catch (simpleError) {
                return imageBuffer;
            }
        }
    } catch (error) {
        return imageBuffer;
    }
};

const extractIdCardInfo = async (idCardImageBuffer) => {
    try {
        if (!idCardImageBuffer || !Buffer.isBuffer(idCardImageBuffer) || idCardImageBuffer.length === 0) {
            return null;
        }

        const TesseractLib = await loadTesseract();
        if (!TesseractLib) {
            return null;
        }

        let processedImageBuffer;
        try {
            processedImageBuffer = await preprocessImageForOCR(idCardImageBuffer);
        } catch (preprocessError) {
            processedImageBuffer = idCardImageBuffer;
        }

        let text = '';
        const whitelist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐabcdefghijklmnopqrstuvwxyzàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ/-,. ';

        try {
            const result6 = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                tessedit_pageseg_mode: '6',
                tessedit_char_whitelist: whitelist,
            });
            text = result6.data.text || '';
        } catch (error) {
            console.error('OCR error with PSM 6:', error);
        }

        if (!text || text.length < 100) {
            try {
                const result11 = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                    tessedit_pageseg_mode: '11',
                    tessedit_char_whitelist: whitelist,
                });
                const text11 = result11.data.text || '';
                if (text11.length > (text?.length || 0)) {
                    text = text11;
                }
            } catch (error) {
                console.error('OCR error with PSM 11:', error);
            }
        }

        if (!text || text.length < 100) {
            try {
                const result4 = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                    tessedit_pageseg_mode: '4',
                    tessedit_char_whitelist: whitelist,
                });
                const text4 = result4.data.text || '';
                if (text4.length > (text?.length || 0)) {
                    text = text4;
                }
            } catch (error) {
                console.error('OCR error with PSM 4:', error);
            }
        }

        if (!text || text.length < 50) {
            try {
                const resultNoWhitelist = await TesseractLib.recognize(processedImageBuffer, 'vie', {
                    tessedit_pageseg_mode: '6',
                });
                const textNoWhitelist = resultNoWhitelist.data.text || '';
                if (textNoWhitelist.length > (text?.length || 0)) {
                    text = textNoWhitelist;
                }
            } catch (error) {
                console.error('OCR error with PSM 6 (no whitelist):', error);
            }
        }

        if (!text || text.trim().length === 0) {
            return null;
        }

        const idCardInfo = {
            idNumber: null,
            fullName: null,
            dateOfBirth: null,
            address: null
        };

        const idNumberPatterns = [
            /Số\s*\/\s*No\.?\s*:?\s*(\d{12})/i,
            /Số\s*:?\s*(\d{12})/i,
            /CCCD[:\s]+(\d{12})/i,
            /CMND[:\s]+(\d{12})/i,
            /\b(\d{12})\b/,
        ];
        for (const pattern of idNumberPatterns) {
            const match = text.match(pattern);
            if (match) {
                idCardInfo.idNumber = match[1] || match[0];
                if (idCardInfo.idNumber && /^\d{12}$/.test(idCardInfo.idNumber)) {
                    break;
                }
            }
        }

        const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
        let nameLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/Họ\s+và\s+tên/i.test(line) || /Họ\s+tên/i.test(line) ||
                /Ho\s+va\s+ten/i.test(line) || /Ho\s+ten/i.test(line)) {
                nameLineIndex = i;
                break;
            }
        }

        if (nameLineIndex >= 0) {
            const nameLine = lines[nameLineIndex];
            const hasFullName = /Full\s+name|ái|ai\s+dau/i.test(nameLine);
            let nameFound = false;

            if (!hasFullName) {
                const sameLinePatterns = [
                    /Họ\s+và\s+tên\s*:?\s*(.+?)(?:\s*$|\s*(?:Ngày|Giới|Quốc|Quê|Nơi|Địa|$))/i,
                    /Họ\s+tên\s*:?\s*(.+?)(?:\s*$|\s*(?:Ngày|Giới|Quốc|Quê|Nơi|Địa|$))/i,
                ];

                for (const pattern of sameLinePatterns) {
                    const match = nameLine.match(pattern);
                    if (match && match[1]) {
                        let name = match[1].trim();
                        name = name.replace(/^(Họ và tên|Họ tên)[:\s]*/i, '');
                        name = name.replace(/\s+/g, ' ');
                        name = name.replace(/[^A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐa-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '');
                        name = name.trim();
                        const words = name.split(/\s+/).filter(w => w.length > 0);
                        if (name.length >= 4 && words.length >= 2 && words.length <= 5) {
                            idCardInfo.fullName = name.toUpperCase();
                            nameFound = true;
                            break;
                        }
                    }
                }
            }

            if (!nameFound) {
                for (let offset = 1; offset <= 3 && nameLineIndex + offset < lines.length; offset++) {
                    const candidateLine = lines[nameLineIndex + offset];
                    if (/^(Ngày|Giới|Quốc|Quê|Nơi|Địa|Số|No|Có giá trị|Date)/i.test(candidateLine) ||
                        /^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(candidateLine)) {
                        continue;
                    }
                    const uppercaseWords = candidateLine.match(/([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]{2,})/g);

                    if (uppercaseWords && uppercaseWords.length >= 2) {
                        const filteredWords = uppercaseWords.filter(word => {
                            const upperWord = word.toUpperCase();
                            if (word.length < 2) return false;
                            return !/^(NGÀY|GIỚI|QUỐC|QUÊ|NƠI|ĐỊA|SỐ|NO|CÓ|GIÁ|TRỊ|DATE|OF|BIRTH|RESIDENCE|ORIGIN|SEX|NATONALTY|TH|SỰ|MM|CO|NGG|OI|VN|VI|ET|NA|MI)$/i.test(upperWord) &&
                                !/^\d+$/.test(word) &&
                                !/\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(word);
                        });

                        if (filteredWords.length >= 2 && filteredWords.length <= 5) {
                            let name = filteredWords.join(' ').trim();
                            const words = name.split(/\s+/).filter(w => w.length > 0);
                            if (name.length >= 4 && words.length >= 2 && words.length <= 5) {
                                idCardInfo.fullName = name.toUpperCase();
                                nameFound = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (!idCardInfo.fullName) {
            const namePatterns = [
                /Họ\s+và\s+tên\s*\/\s*Full\s+name\s*:?\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]+?)(?=\n|Ngày|Giới|Quốc|Quê|Nơi|$)/i,
                /Họ\s+và\s+tên\s*:?\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]+?)(?=\n|Ngày|Giới|Quốc|Quê|Nơi|$)/i,
                /(?:Họ\s+và\s+tên|Họ\s+tên|Full\s+name)[:\s\/]*\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]{3,}?)(?=\n|Ngày|Giới|Quốc|Quê|Nơi|$)/i,
            ];

            for (const pattern of namePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    let name = match[1].trim().replace(/\s+/g, ' ');
                    name = name.replace(/[^A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s]/gi, '');
                    name = name.trim();
                    const words = name.split(/\s+/).filter(w => w.length > 0);
                    if (name.length >= 4 && words.length >= 2) {
                        idCardInfo.fullName = name;
                        break;
                    }
                }
            }
        }

        const datePatterns = [
            /Ngày sinh\s*\/\s*Date of birth\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
            /Ngày sinh[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
            /Ngày, tháng, năm sinh[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
            /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
        ];
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1].replace(/-/g, '/');
                const [day, month, year] = dateStr.split('/');
                if (day && month && year && parseInt(day) <= 31 && parseInt(month) <= 12 && parseInt(year) >= 1900 && parseInt(year) <= 2100) {
                    idCardInfo.dateOfBirth = new Date(`${year}-${month}-${day}`);
                    if (isNaN(idCardInfo.dateOfBirth.getTime())) {
                        idCardInfo.dateOfBirth = null;
                    } else {
                        break;
                    }
                }
            }
        }

        let addressLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/Nơi\s+thường\s+trú/i.test(line) || /ơi\s+thường\s+trú/i.test(line) ||
                /Địa\s+chỉ\s+thường\s+trú/i.test(line) || /Place\s+of\s+residence/i.test(line)) {
                addressLineIndex = i;
                break;
            }
        }

        if (addressLineIndex >= 0) {
            const addressLine = lines[addressLineIndex];
            const sameLinePatterns = [
                /Nơi\s+thường\s+trú\s*\/\s*Place\s+of\s+residence\s*:?\s*(.+)/i,
                /Địa\s+chỉ\s+thường\s+trú\s*\/\s*Place\s+of\s+residence\s*:?\s*(.+)/i,
                /Nơi\s+thường\s+trú\s*:?\s*(.+)/i,
                /Địa\s+chỉ\s+thường\s+trú\s*:?\s*(.+)/i,
                /ơi\s+thường\s+trú\s*:?\s*(.+)/i,
            ];

            let addressFromSameLine = '';
            for (const pattern of sameLinePatterns) {
                const match = addressLine.match(pattern);
                if (match && match[1]) {
                    addressFromSameLine = match[1].trim();
                    addressFromSameLine = addressFromSameLine.replace(/^(Địa chỉ|Địa chỉ thường trú|Nơi thường trú|Place of residence|ơi thường trú)[:\s]*/i, '');
                    addressFromSameLine = addressFromSameLine.replace(/[.,;:]+$/, '').trim();
                    break;
                }
            }

            let addressLines = [];
            if (addressFromSameLine && addressFromSameLine.length > 0) {
                addressLines.push(addressFromSameLine);
            }

            for (let i = addressLineIndex + 1; i < lines.length; i++) {
                const line = lines[i];
                if (/Có\s+giá\s+trị/i.test(line) || /Date\s+of\s+expiry/i.test(line)) {
                    break;
                }
                if (line.length > 0 &&
                    !/^(Ngày|Giới|Quốc|Quê|Nơi|Địa|Số|No)/i.test(line) &&
                    !/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(line)) {
                    addressLines.push(line);
                }
            }

            if (addressLines.length > 0) {
                const combinedAddress = addressLines.join(' ').trim();
                let address = '';

                const houseNumberMatch = combinedAddress.match(/^(\d{1,4})\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ])/);
                let houseNumber = '';
                if (houseNumberMatch && houseNumberMatch[1]) {
                    houseNumber = houseNumberMatch[1] + ' ';
                }

                address = combinedAddress.replace(/^[\d\s°°đ]{10,}/i, '');
                address = address.replace(/^[^\wÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]+/i, '');
                address = address.replace(/\b[a-z]\s+\d{4}\s+\d+[đ°°]+\d*/gi, '');
                address = address.replace(/\b\d{5,}\s*[a-z]+\s*\d+[đ°°]+/gi, '');
                address = address.replace(/\b\d+[đ°°]+\d*/gi, '');
                address = address.replace(/[°°`…\.\.\.]+/g, ' ');
                address = address.replace(/\s*—\s*/g, ' ');
                address = address.replace(/\s+[A-Z]\s+/g, ' ');

                if (houseNumber && !address.match(/^\d{1,4}\s/)) {
                    address = houseNumber + address;
                }

                address = address.replace(/^(Địa chỉ|Địa chỉ thường trú|Nơi thường trú|Place of residence|ơi thường trú)[:\s]*/i, '');
                address = address.replace(/:\s*[a-z]+$/i, '');
                address = address.replace(/`\.\.\./g, '');
                address = address.replace(/[°°`…]+$/g, '');
                address = address.replace(/[.,;:]+$/, '').trim();
                address = address.replace(/\s+/g, ' ').trim();
                address = address.replace(/\b\d{4}\s*\d+\s*[a-z]+\s*\d+[đ°°]+/gi, '');
                address = address.replace(/\s+/g, ' ').trim();

                const words = address.split(/\s+/).filter(word => {
                    const trimmedWord = word.trim();
                    if (!trimmedWord || trimmedWord.length === 0) return false;
                    if (/^\d{1,4}$/.test(trimmedWord)) return true;
                    if (/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(trimmedWord)) {
                        if (trimmedWord.length >= 2 && /[A-Za-zÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(trimmedWord)) {
                            const letterCount = (trimmedWord.match(/[A-Za-zÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g) || []).length;
                            const specialCharCount = (trimmedWord.match(/[^A-Za-z0-9ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/g) || []).length;
                            if (letterCount > specialCharCount && letterCount >= 2) {
                                return true;
                            }
                        }
                    }
                    if (/^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]{2,}$/.test(trimmedWord)) {
                        if (trimmedWord.length >= 2 && !/^[A-Z]{1}$/.test(trimmedWord)) {
                            return true;
                        }
                    }
                    const commonPlaceWords = ['xa', 'phuong', 'quan', 'huyen', 'thi', 'xã', 'phường', 'quận', 'huyện', 'thị', 'tp', 'thanh', 'pho', 'thành', 'phố', 'hanoi', 'hà', 'nội'];
                    if (commonPlaceWords.includes(trimmedWord.toLowerCase())) return true;
                    return false;
                });

                const cleanedWords = words.map(word => {
                    let cleaned = word.replace(/^[^A-Za-z0-9ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+|[^A-Za-z0-9ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+$/g, '');
                    cleaned = cleaned.replace(/[^A-Za-z0-9ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\-]/g, '');
                    return cleaned.trim();
                }).filter(word => word.length > 0);

                address = cleanedWords.join(' - ');

                if (address.length > 10 && address.length <= 200 && /[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(address)) {
                    idCardInfo.address = address;
                }
            }
        }

        if (!idCardInfo.address) {
            const addressPatterns = [
                /Nơi\s+thường\s+trú\s*\/\s*Place\s+of\s+residence\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Có giá trị|Date of expiry|$)/i,
                /ơi\s+thường\s+trú\s*\/\s*Place\s+of\s+residence\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Có giá trị|Date of expiry|$)/i,
                /Địa\s+chỉ\s+thường\s+trú\s*\/\s*Place\s+of\s+residence\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Có giá trị|Date of expiry|$)/i,
                /Nơi\s+thường\s+trú\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Có giá trị|Date of expiry|$)/i,
                /ơi\s+thường\s+trú\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Có giá trị|Date of expiry|$)/i,
                /Địa\s+chỉ\s+thường\s+trú\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Có giá trị|Date of expiry|$)/i,
            ];

            for (const pattern of addressPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    let address = match[1].trim();
                    address = address.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
                    address = address.replace(/^[\d\s°°đ]+/i, '');
                    address = address.replace(/^[^\wÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]+/i, '');
                    address = address.replace(/^(Địa chỉ|Địa chỉ thường trú|Nơi thường trú|Place of residence|ơi thường trú)[:\s]*/i, '');
                    address = address.replace(/[.,;:]+$/, '').trim();
                    address = address.replace(/[°°`]+$/g, '');
                    if (address.length > 200) {
                        address = address.substring(0, 200);
                    }
                    if (address.length > 10 && /[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(address)) {
                        idCardInfo.address = address;
                        break;
                    }
                }
            }
        }

        if (!idCardInfo.address) {
            const placeOfOriginPatterns = [
                /Quê\s+quán\s*\/\s*Place\s+of\s+origin\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Nơi|Địa|Có giá trị|Date of expiry|$)/i,
                /Quê\s+quán\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n|Nơi|Địa|Có giá trị|Date of expiry|$)/i,
            ];
            for (const pattern of placeOfOriginPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    let address = match[1].trim();
                    address = address.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
                    address = address.replace(/^(Quê quán|Place of origin)[:\s]*/i, '');
                    address = address.replace(/[.,;:]+$/, '').trim();
                    if (address.length > 10 && address.length <= 200 && /[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(address)) {
                        idCardInfo.address = address;
                        break;
                    }
                }
            }
        }

        if (idCardInfo.idNumber || idCardInfo.fullName || idCardInfo.dateOfBirth || idCardInfo.address) {
            return idCardInfo;
        }

        return null;
    } catch (error) {
        console.error('Error extracting ID card information:', error);
        return null;
    }
};

module.exports.sendOtpViaFirebase = async (req, res) => {
    try {
        const { phone, recaptchaToken } = req.body;
        if (!phone) {
            return res.status(400).json({ code: 400, message: "Thiếu số điện thoại" });
        }

        const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
        const usingEmulator = Boolean(emulatorHost);
        const apiKey = usingEmulator ? "dummy" : process.env.FIREBASE_WEB_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                code: 500,
                message: "Thiếu FIREBASE_WEB_API_KEY trong môi trường. Vui lòng kiểm tra cấu hình Firebase.",
                error: "Missing FIREBASE_WEB_API_KEY environment variable"
            });
        }

        const baseUrl = usingEmulator
            ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1`
            : `https://identitytoolkit.googleapis.com/v1`;

        const payload = usingEmulator
            ? { phoneNumber: phone }
            : { phoneNumber: phone, recaptchaToken };

        if (!usingEmulator && !recaptchaToken) {
            return res.status(400).json({ code: 400, message: "Thiếu recaptchaToken (production)" });
        }

        const fetch = await initFetch();
        const response = await fetch(`${baseUrl}/accounts:sendVerificationCode?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            timeout: 30000
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(400).json({
                code: 400,
                message: data.error?.message || "Gửi OTP thất bại",
                error: data
            });
        }

        return res.json({
            code: 200,
            message: "Đã gửi OTP qua Firebase",
            data: { sessionInfo: data.sessionInfo }
        });
    } catch (error) {
        console.error('OTP sending error:', error);
        let errorMessage = "Lỗi khi gửi OTP";
        let statusCode = 500;

        if (error.message.includes('fetch failed')) {
            errorMessage = "Không thể kết nối đến dịch vụ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.";
            statusCode = 503;
        } else if (error.message.includes('timeout')) {
            errorMessage = "Yêu cầu gửi OTP quá thời gian chờ. Vui lòng thử lại.";
            statusCode = 408;
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage = "Không thể kết nối đến server xác thực. Vui lòng thử lại sau.";
            statusCode = 503;
        } else if (error.message.includes('Invalid API key')) {
            errorMessage = "Cấu hình API key không đúng. Vui lòng liên hệ quản trị viên.";
            statusCode = 500;
        }

        return res.status(statusCode).json({
            code: statusCode,
            message: errorMessage,
            error: error.message
        });
    }
}

module.exports.verifyOtpViaFirebase = async (req, res) => {
    try {
        const { sessionInfo, code } = req.body;
        if (!sessionInfo || !code) {
            return res.status(400).json({ code: 400, message: "Thiếu sessionInfo hoặc mã OTP" });
        }

        const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
        const usingEmulator = Boolean(emulatorHost);
        const apiKey = usingEmulator ? "dummy" : process.env.FIREBASE_WEB_API_KEY;

        if (!apiKey) {
            const mockUserId = `mock_user_${Date.now()}`;
            const mockPhone = "0123456789";
            return res.json({
                code: 200,
                message: "Xác minh OTP thành công (Mock Mode)",
                data: {
                    phone: mockPhone,
                    userId: mockUserId,
                    isPhoneConfirmed: true
                },
                warning: "Đang sử dụng mock verification cho development. Vui lòng cấu hình Firebase để sử dụng thật."
            });
        }

        const baseUrl = usingEmulator
            ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1`
            : `https://identitytoolkit.googleapis.com/v1`;

        const fetch = await initFetch();
        const response = await fetch(`${baseUrl}/accounts:signInWithPhoneNumber?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionInfo, code })
        });
        const data = await response.json();
        if (!response.ok) {
            return res.status(400).json({ code: 400, message: data.error?.message || "Xác minh OTP thất bại", error: data });
        }

        let admin, decoded, phoneNumber;
        try {
            admin = getAdmin();
            decoded = await admin.auth().verifyIdToken(data.idToken);
            phoneNumber = decoded.phone_number;
        } catch (adminError) {
            console.error('Firebase Admin SDK error:', adminError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi xác thực Firebase Admin SDK. Vui lòng kiểm tra cấu hình Firebase.",
                error: adminError.message
            });
        }

        if (!phoneNumber) {
            return res.status(400).json({
                code: 400,
                message: "ID token không chứa số điện thoại"
            });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        if (!validateVietnamesePhoneNumber(formattedPhone)) {
            return res.status(400).json({
                code: 400,
                message: "Số điện thoại không đúng định dạng Việt Nam"
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                code: 401,
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh"
            });
        }

        try {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { phone: formattedPhone, isPhoneConfirmed: true },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(404).json({
                    code: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            return res.json({
                code: 200,
                message: "Xác minh số điện thoại thành công",
                data: {
                    phone: formattedPhone,
                    userId: updatedUser._id,
                    isPhoneConfirmed: updatedUser.isPhoneConfirmed,
                    user: updatedUser
                }
            });
        } catch (dbError) {
            console.error('Database update error:', dbError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi cơ sở dữ liệu khi cập nhật số điện thoại",
                error: dbError.message
            });
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        let errorMessage = "Lỗi khi xác minh OTP";
        let statusCode = 500;

        if (error.message.includes('fetch failed')) {
            errorMessage = "Không thể kết nối đến dịch vụ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.";
            statusCode = 503;
        } else if (error.message.includes('timeout')) {
            errorMessage = "Yêu cầu xác minh OTP quá thời gian chờ. Vui lòng thử lại.";
            statusCode = 408;
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage = "Không thể kết nối đến server xác thực. Vui lòng thử lại sau.";
            statusCode = 503;
        } else if (error.message.includes('Invalid API key')) {
            errorMessage = "Cấu hình API key không đúng. Vui lòng liên hệ quản trị viên.";
            statusCode = 500;
        } else if (error.message.includes('Firebase Admin credentials')) {
            errorMessage = "Cấu hình Firebase Admin SDK không đúng. Vui lòng kiểm tra environment variables.";
            statusCode = 500;
        } else if (error.message.includes('Database')) {
            errorMessage = "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.";
            statusCode = 500;
        }

        return res.status(statusCode).json({
            code: statusCode,
            message: errorMessage,
            error: error.message
        });
    }
}

module.exports.confirmPhoneWithFirebaseIdToken = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ code: 400, message: "Thiếu Firebase ID token" });
        }

        const admin = getAdmin();
        const decoded = await admin.auth().verifyIdToken(idToken);
        const phoneNumber = decoded.phone_number;
        if (!phoneNumber) {
            return res.status(400).json({ code: 400, message: "ID token không chứa số điện thoại" });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        if (!validateVietnamesePhoneNumber(formattedPhone)) {
            return res.status(400).json({
                code: 400,
                message: "Số điện thoại không đúng định dạng Việt Nam"
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                code: 401,
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh"
            });
        }

        try {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { phone: formattedPhone, isPhoneConfirmed: true },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(404).json({
                    code: 404,
                    message: "Không tìm thấy người dùng"
                });
            }

            try {
                await createNotification(
                    userId,
                    "Xác minh số điện thoại thành công",
                    "Xác minh số điện thoại thành công",
                    `Số điện thoại ${formattedPhone} của bạn đã được xác minh thành công.`,
                    {
                        phone: formattedPhone,
                        type: 'phone_verification_success',
                        redirectUrl: '/auth/verification-history'
                    }
                );
            } catch (notificationError) {
                console.error("Error creating phone verification notification:", notificationError);
            }

            return res.json({
                code: 200,
                message: "Xác minh số điện thoại (Firebase) thành công",
                data: {
                    phone: formattedPhone,
                    userId: updatedUser._id,
                    isPhoneConfirmed: updatedUser.isPhoneConfirmed,
                    user: updatedUser
                }
            });
        } catch (dbError) {
            console.error('Database update error:', dbError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi cơ sở dữ liệu khi cập nhật số điện thoại",
                error: dbError.message
            });
        }
    } catch (error) {
        return res.status(500).json({ code: 500, message: "Xác minh Firebase ID token thất bại", error: error.message });
    }
}

module.exports.previewIdCardOcr = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                code: 400,
                message: "Vui lòng upload ảnh mặt trước căn cước công dân"
            });
        }

        let extractedIdCardInfo = null;
        try {
            extractedIdCardInfo = await extractIdCardInfo(req.file.buffer);
        } catch (ocrError) {
            console.error('OCR Preview - Error extracting ID card info:', ocrError);
            let errorMessage = "Lỗi khi đọc thông tin từ ảnh. Vui lòng thử lại hoặc nhập thủ công.";

            if (ocrError.message?.includes('memory') || ocrError.message?.includes('Memory')) {
                errorMessage = "Ảnh quá lớn hoặc không đủ bộ nhớ để xử lý. Vui lòng thử lại với ảnh nhỏ hơn.";
            } else if (ocrError.message?.includes('format') || ocrError.message?.includes('Format')) {
                errorMessage = "Định dạng ảnh không được hỗ trợ. Vui lòng sử dụng ảnh JPG, PNG.";
            } else if (ocrError.message?.includes('timeout') || ocrError.message?.includes('Timeout')) {
                errorMessage = "Quá trình đọc ảnh mất quá nhiều thời gian. Vui lòng thử lại.";
            }

            return res.status(500).json({
                code: 500,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? ocrError.message : undefined
            });
        }

        return res.json({
            code: 200,
            message: "Đã đọc thông tin từ ảnh thành công",
            data: {
                extractedIdCardInfo: extractedIdCardInfo ? {
                    idNumber: extractedIdCardInfo.idNumber || null,
                    fullName: extractedIdCardInfo.fullName || null,
                    dateOfBirth: extractedIdCardInfo.dateOfBirth ? extractedIdCardInfo.dateOfBirth.toISOString() : null,
                    address: extractedIdCardInfo.address || null
                } : null
            }
        });
    } catch (error) {
        console.error('OCR Preview error:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi khi đọc thông tin từ ảnh",
            error: error.message
        });
    }
};

module.exports.verifyFaceImages = async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({
                code: 400,
                message: "Vui lòng upload đủ 2 ảnh: mặt trước căn cước công dân và mặt sau căn cước công dân"
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                code: 401,
                message: "User chưa đăng nhập. Vui lòng đăng nhập trước khi xác minh"
            });
        }

        const files = req.files;
        const idCardFrontFile = files[0];
        const idCardBackFile = files[1];

        if (!idCardFrontFile || !idCardBackFile) {
            return res.status(400).json({
                code: 400,
                message: "Thiếu ảnh. Vui lòng upload đủ 2 ảnh: mặt trước và mặt sau căn cước công dân"
            });
        }

        let extractedIdCardInfo = null;
        if (req.body.idCardInfo) {
            try {
                const providedInfo = typeof req.body.idCardInfo === 'string'
                    ? JSON.parse(req.body.idCardInfo)
                    : req.body.idCardInfo;

                extractedIdCardInfo = {
                    idNumber: providedInfo.idNumber || null,
                    fullName: providedInfo.fullName || null,
                    dateOfBirth: providedInfo.dateOfBirth || null,
                    address: providedInfo.address || null
                };
            } catch (parseError) {
                console.error('Error parsing idCardInfo from request:', parseError);
            }
        }

        if (!extractedIdCardInfo || (!extractedIdCardInfo.idNumber && !extractedIdCardInfo.fullName)) {
            try {
                const ocrResult = await extractIdCardInfo(idCardFrontFile.buffer);
                if (ocrResult) {
                    extractedIdCardInfo = {
                        idNumber: extractedIdCardInfo?.idNumber || ocrResult.idNumber || null,
                        fullName: extractedIdCardInfo?.fullName || ocrResult.fullName || null,
                        dateOfBirth: extractedIdCardInfo?.dateOfBirth || ocrResult.dateOfBirth || null,
                        address: extractedIdCardInfo?.address || ocrResult.address || null
                    };
                }
            } catch (ocrError) {
                console.error('Error extracting ID card info with OCR:', ocrError);
            }
        }

        const existingRequest = await VerificationRequest.findOne({
            userId: userId,
            status: { $in: ['Pending', 'In Progress'] }
        });

        if (existingRequest) {
            return res.status(400).json({
                code: 400,
                message: "Bạn đã có yêu cầu xác minh đang chờ xử lý. Vui lòng chờ moderator xử lý."
            });
        }

        let uploadedFiles = [];
        try {
            uploadedFiles = await uploadToCloudinary(files, "retrotrade/verification-requests/");
            if (!uploadedFiles || uploadedFiles.length !== 2) {
                return res.status(400).json({
                    code: 400,
                    message: "Lỗi khi upload ảnh. Vui lòng thử lại"
                });
            }
        } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            return res.status(500).json({
                code: 500,
                message: "Lỗi khi upload ảnh lên server",
                error: uploadError.message
            });
        }

        const documentTypes = ['idCardFront', 'idCardBack'];
        const documents = uploadedFiles.map((file, index) => {
            return {
                documentType: documentTypes[index] || 'document',
                fileUrl: file.Url,
                uploadedAt: new Date()
            };
        });

        const hasValidIdCardInfo = extractedIdCardInfo && (
            extractedIdCardInfo.idNumber ||
            extractedIdCardInfo.fullName ||
            extractedIdCardInfo.dateOfBirth ||
            extractedIdCardInfo.address
        );

        const shouldAutoReject = !hasValidIdCardInfo;

        const verificationRequest = new VerificationRequest({
            userId: userId,
            idCardInfo: extractedIdCardInfo ? {
                idNumber: extractedIdCardInfo.idNumber || null,
                fullName: extractedIdCardInfo.fullName || null,
                dateOfBirth: extractedIdCardInfo.dateOfBirth ? new Date(extractedIdCardInfo.dateOfBirth) : null,
                address: extractedIdCardInfo.address || null
            } : null,
            documents: documents,
            reason: req.body.reason || null,
            status: shouldAutoReject ? 'Rejected' : 'Pending',
            rejectionReason: shouldAutoReject
                ? 'Hệ thống không thể đọc được thông tin từ ảnh căn cước công dân. Vui lòng chụp lại ảnh rõ nét hơn hoặc đảm bảo ảnh không bị mờ, không bị che khuất thông tin.'
                : null,
            handledAt: shouldAutoReject ? new Date() : null
        });

        await verificationRequest.save();
        await verificationRequest.populate('userId', 'fullName email phone');

        if (shouldAutoReject) {
            try {
                await createNotification(
                    userId,
                    "Xác minh CCCD bị từ chối",
                    "Xác minh CCCD bị từ chối",
                    `Yêu cầu xác minh căn cước công dân của bạn đã bị từ chối tự động. Lý do: Hệ thống không thể đọc được thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét hơn.`,
                    {
                        requestId: verificationRequest._id.toString(),
                        type: 'id_card_verification_rejected',
                        redirectUrl: '/auth/verification-history'
                    }
                );
            } catch (notificationError) {
                console.error("Error creating rejection notification:", notificationError);
            }
        } else {
            try {
                const moderators = await User.find({ role: 'moderator', isDeleted: false });
                for (const moderator of moderators) {
                    await createNotification(
                        moderator._id,
                        "Yêu cầu xác minh CCCD mới",
                        "Yêu cầu xác minh CCCD mới",
                        `Có yêu cầu xác minh căn cước công dân mới từ ${req.user.fullName || req.user.email}. Vui lòng xử lý.`,
                        {
                            requestId: verificationRequest._id.toString(),
                            userId: userId.toString(),
                            type: 'id_card_verification_request'
                        }
                    );
                }
            } catch (notificationError) {
                console.error("Error creating notifications:", notificationError);
            }

            try {
                await createNotification(
                    userId,
                    "Đã gửi yêu cầu xác minh CCCD",
                    "Yêu cầu xác minh CCCD đã được gửi",
                    `Yêu cầu xác minh căn cước công dân của bạn đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất.`,
                    {
                        requestId: verificationRequest._id.toString(),
                        type: 'id_card_verification_submitted',
                        redirectUrl: '/auth/verification-history'
                    }
                );
            } catch (notificationError) {
                console.error("Error creating user notification:", notificationError);
            }
        }

        const responseData = {
            requestId: verificationRequest._id,
            userId: userId,
            status: verificationRequest.status,
            documents: verificationRequest.documents || [],
            idCardInfo: verificationRequest.idCardInfo ? {
                idNumber: verificationRequest.idCardInfo.idNumber || null,
                fullName: verificationRequest.idCardInfo.fullName || null,
                dateOfBirth: verificationRequest.idCardInfo.dateOfBirth ? verificationRequest.idCardInfo.dateOfBirth.toISOString() : null,
                address: verificationRequest.idCardInfo.address || null,
                extractionMethod: 'ocr_user_confirmed'
            } : null,
            extractedIdCardInfo: extractedIdCardInfo ? {
                idNumber: extractedIdCardInfo.idNumber,
                fullName: extractedIdCardInfo.fullName,
                dateOfBirth: extractedIdCardInfo.dateOfBirth ? (typeof extractedIdCardInfo.dateOfBirth === 'string' ? extractedIdCardInfo.dateOfBirth : extractedIdCardInfo.dateOfBirth.toISOString()) : null,
                address: extractedIdCardInfo.address
            } : null
        };

        if (shouldAutoReject) {
            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã bị từ chối tự động do không thể đọc được thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét hơn.",
                data: {
                    ...responseData,
                    autoRejected: true,
                    rejectionReason: verificationRequest.rejectionReason
                }
            });
        } else {
            return res.json({
                code: 200,
                message: "Yêu cầu xác minh đã được gửi thành công. Moderator sẽ xử lý trong thời gian sớm nhất.",
                data: responseData
            });
        }
    } catch (error) {
        console.error('Verification request creation error:', error);
        return res.status(500).json({
            code: 500,
            message: "Lỗi khi tạo yêu cầu xác minh",
            error: error.message
        });
    }
};
