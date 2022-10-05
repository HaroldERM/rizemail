import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react'
import { MdOutlineAutoDelete } from 'react-icons/md';
import { BsPaperclip } from 'react-icons/bs';
import { MdClose } from 'react-icons/md';
import { FaEdit } from 'react-icons/fa';
import { TbLock } from 'react-icons/tb';
import { RiSendPlaneFill } from 'react-icons/ri';
import { AiFillDelete } from 'react-icons/ai';
import { RiDeleteBack2Line } from "react-icons/ri";
import { BiSearchAlt } from "react-icons/bi";
import { useSelector } from 'react-redux';
import ScrollToBottom from 'react-scroll-to-bottom';
import { AES, enc } from "crypto-js";
import '../styles/chatbox.css'
import Modals from './Modals';
import { db, storage } from '../firebase/firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import $ from 'jquery';
import Datetime from './Datetime';
import { toast } from "react-toastify";

const Chatbox = () => {
    const [value, setValue] = useState("");
    const [searchValue, setSearchValue] = useState("");
    const [dateSearchValue, setDateSearchValue] = useState("");
    const [listMessage, setlistMessage] = useState([]);
    const [sender, setSender] = useState();
    const [showModal, setShowModal] = useState(false);
    const [listFiles, setListFiles] = useState([]);
    const [listFilesSendURL, setListFilesSendURL] = useState([]);
    const [listReminderMessage, setListReminderMessage] = useState([]);
    const [listDestroyMessage, setListDestroyMessage] = useState([]);
    const [uploadValue, setUploadValue] = useState(0);
    const [messageFile, setMessageFile] = useState("");
    const [editMessage, setEditMessage] = useState("");
    const [editMessageObj, setEditMessageObj] = useState("");
    const [blockChatCondition, setBlockChatCondition] = useState();
    const [docRefBlock, setDocRefBlock] = useState();
    const [listFilteredMessage, setlistFilteredMessage] = useState([]);

    const userCredential = useSelector((state) => state.auth.userCredentials);
    const docRef = useSelector((state) => state?.chat.chatCredentials);

    useEffect(() => {
        if (listFiles.length !== 0) {
            let listTemp = [];
            listFiles.forEach((file) => {
                let type = file.type.split("/");
                let storageRef;
                let uploadTask;
                switch (type[0]) {
                    case "image":
                        storageRef = ref(storage, `Image/${file.name}`);
                        break;
                    case "audio":
                        storageRef = ref(storage, `Audio/${file.name}`);
                        break;
                    case "video":
                        storageRef = ref(storage, `Video/${file.name}`);
                        break;
                    default:
                        storageRef = ref(storage, `OtherFile/${file.name}`);
                        break;
                }
                uploadTask = uploadBytesResumable(storageRef, file);
                uploadTask.on('state_changed', (snapshot) => {
                    setUploadValue((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                }, (error) => {
                    setMessageFile(error);
                }, () => {
                    setMessageFile("File Uploaded");
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        listTemp.push({ urlFile: downloadURL, typeFile: type[0] });
                        console.log('File available at', downloadURL);
                    });
                });
            });
            setListFilesSendURL(listTemp);
            setListFiles([]);
            setUploadValue(0);
            setMessageFile("");
        }

        if (docRef) {
            setSender(docRef.chat.data());
            const q = query(collection(docRef?.chatDocRef, "message"), orderBy('date'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const listTemp = [];
                snapshot.docs.forEach((doc) => {
                    listTemp.push(doc.data());
                });
                setlistMessage(listTemp);
            });
            return unsubscribe;
        }
    }, [docRef, userCredential?.uid, listFiles, listFilesSendURL, uploadValue]);

    useEffect(() => {
        if (listReminderMessage.length !== 0) {
            let timeRange;
            let timeOut;
            let time = new Date();
            listReminderMessage.forEach((reminderMsg) => {
                timeRange = ((reminderMsg.date.seconds * 1000) - time.getTime());
                timeOut = setTimeout(async () => {

                    const colRef = collection(docRef?.chatDocRef, "message");

                    await setDoc(doc(colRef, reminderMsg.id), {
                        message: reminderMsg.message,
                        uid: userCredential?.uid,
                        date: new Date().toISOString(),
                        type: "string"
                    });

                    let db = collection(docRef?.chatDocRef, "reminder");
                    await deleteDoc(doc(db, reminderMsg.id));
                    setListReminderMessage([]);

                }, timeRange);
            });
            return () => { clearTimeout(timeOut); }
        }
    }, [listReminderMessage, docRef?.chatDocRef, userCredential?.uid]);

    useEffect(() => {
        if (listDestroyMessage.length !== 0) {
            let timeRange;
            let timeOut;
            let time = new Date();
            listDestroyMessage.forEach((reminderMsg) => {
                if (reminderMsg.dateDestroy) {
                    timeRange = ((reminderMsg.dateDestroy.seconds * 1000) - time.getTime());
                    timeOut = setTimeout(async () => {

                        const colRef = collection(docRef?.chatDocRef, "message");
                        await deleteDoc(doc(colRef, reminderMsg.id));
                        setListDestroyMessage([]);

                    }, timeRange);
                }
            });
            return () => { clearTimeout(timeOut); }
        }
    }, [listDestroyMessage, docRef?.chatDocRef, userCredential?.uid]);

    const onSend = async (e) => {
        e.preventDefault();

        const queryChat1 = query(collection(db, 'users'), where("uid", "==", userCredential.uid));
        const response1 = await getDocs(queryChat1);

        if (editMessage) {
            onEdit(editMessageObj, value);
            setEditMessage("");
            setEditMessageObj("");
        } else if (value) {
            const colRef = collection(docRef?.chatDocRef, "message");

            let encrypted = AES.encrypt(value, "E1F53135E559C253WE12FACF2FF").toString();

            await addDoc(colRef, {
                message: encrypted,
                uid: userCredential.uid,
                date: new Date().toISOString(),
                type: "string"
            });

            if (response1.size) {
                response1.forEach(async (doc) => {
                    await updateDoc(doc.ref, {
                        numbMessage: (doc.data().numbMessage + 1)
                    });
                });
            }
        }
        setValue("");
    }

    const onSendFiles = () => {
        const queryChat1 = query(collection(db, 'users'), where("uid", "==", userCredential.uid));

        if (listFilesSendURL.length !== 0) {
            listFilesSendURL.forEach(async (file) => {
                const response1 = await getDocs(queryChat1);
                const colRef = collection(docRef?.chatDocRef, "message");

                let encrypted = AES.encrypt(JSON.stringify(file), "E1F53135E559C253WE12FACF2FF").toString();

                if (file.typeFile === 'image') {
                    if (response1.size) {
                        response1.forEach(async (doc) => {
                            await updateDoc(doc.ref, {
                                numbImage: (doc.data().numbImage + 1)
                            });
                        });
                    }
                } else if (file.typeFile === 'audio') {
                    if (response1.size) {
                        response1.forEach(async (doc) => {
                            await updateDoc(doc.ref, {
                                numbAudio: (doc.data().numbAudio + 1)
                            });
                        });
                    }
                } else if (file.typeFile === 'video') {
                    if (response1.size) {
                        response1.forEach(async (doc) => {
                            await updateDoc(doc.ref, {
                                numbVideo: (doc.data().numbVideo + 1)
                            });
                        });
                    }
                } else {
                    if (response1.size) {
                        response1.forEach(async (doc) => {
                            await updateDoc(doc.ref, {
                                numbOtherFile: (doc.data().numbOtherFile + 1)
                            });
                        });
                    }
                }

                await addDoc(colRef, {
                    message: encrypted,
                    uid: userCredential.uid,
                    date: new Date().toISOString(),
                    //date: new Date().toLocaleDateString() + ' - ' + new Date().getHours + ':' + new Date().getMinutes(),
                    type: "object"
                });
            });
        }
        setListFilesSendURL([]);
    }

    const onDelete = async (msg) => {
        if (window.confirm('Are you sure you want to delete?')) {
            const colRef = collection(docRef?.chatDocRef, "message");

            const queryChat1 = query(colRef, where("date", "==", msg.date), where("message", "==", msg.message));
            const response1 = await getDocs(queryChat1);

            if (response1.size) {
                response1.forEach(async (doc) => {
                    await deleteDoc(doc.ref);
                });
            }
        }
    }

    const onEdit = async (msg, msgValue) => {
        const colRef = collection(docRef?.chatDocRef, "message");
        let encrypted = AES.encrypt(msgValue, "E1F53135E559C253WE12FACF2FF").toString();

        const queryChat1 = query(colRef, where("date", "==", msg.date), where("message", "==", msg.message));
        const response1 = await getDocs(queryChat1);

        if (response1.size) {
            response1.forEach(async (doc) => {
                await updateDoc(doc.ref, {
                    message: encrypted
                });
            });
        }
    }

    const onBlockUser = async () => {

        if (docRefBlock) {
            if (blockChatCondition) {
                setBlockChatCondition(false);
                await updateDoc(docRefBlock, {
                    block: false
                });
            } else {
                setBlockChatCondition(true);
                await updateDoc(docRefBlock, {
                    block: true
                });
            }
        }
    }

    useEffect(() => {
        async function onBlockChat() {
            if (sender) {
                const queryChat1 = query(collection(db, "chats"), where("user1.uid", "==", sender?.user1.uid), where("user2.uid", "==", sender?.user2.uid));
                const response1 = await getDocs(queryChat1);
                if (response1.size) {
                    response1.forEach((doc) => {
                        setBlockChatCondition(doc.data().block);
                        setDocRefBlock(doc.ref);
                        return blockChatCondition;
                    });
                }

                const queryChat2 = query(collection(db, "chats"), where("user2.uid", "==", sender?.user1.uid), where("user1.uid", "==", sender?.user2.uid));
                const response2 = await getDocs(queryChat2);
                if (response2.size) {
                    response2.forEach((doc) => {
                        setBlockChatCondition(doc.data().block);
                        setDocRefBlock(doc.ref);
                        return blockChatCondition;
                    });
                }
            }
        }

        onBlockChat();
    }, [sender, blockChatCondition]);

    const giveFormatToDate = (date) => {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "Octuber", "November", "December"
        ];
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday "
        ];

        var day = dayNames[date.getDay()];
        var month = monthNames[date.getMonth()];
        let minutes = date.getMinutes();
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        var timeHoursMinutes = date.getHours() + ":" + minutes;

        var fomattedDate = day + ", " + date.getDate() + " de " + month + " - " + timeHoursMinutes;
        return fomattedDate;
    }

    const getWeather = (e) => {
        if (navigator && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const coords = pos.coords;
                let latitude = coords.latitude.toString();
                let longitude = coords.longitude.toString();

                var url = 'https://api.openweathermap.org/data/2.5/weather?lat=' + latitude + '&lon=' + longitude + '&appid=d9a359371b6d947702e393a5ff067359&lang=es';

                $.get(url, (data) => {
                    const description = data.weather[0].description;
                    const wheatherDescription = description.charAt(0).toUpperCase() + description.slice(1);
                    var display = data.name + ", " + (Math.trunc(data.main.temp / 10)) + " °C | " + giveFormatToDate(new Date()) + "\n" +
                        wheatherDescription + " • Humidity: " + data.main.humidity + "% • Pressure: " + data.main.pressure + " mb";
                    //Set the result to a State variable
                    toast.info(display, { position: toast.POSITION.BOTTOM_CENTER, closeOnClick: true, autoClose: false, style: { width: '1000px' } });
                })
            });
        }
    }

    const googleResults = async (queryToBeDone) => {
        let result = "";
        var GOOGLE_API_KEY = 'AIzaSyBSCvReAvT9yHzoa9nBDNbcj79DyKCKeMc'; //Google Custom Search API

        var url = 'https://www.googleapis.com/customsearch/v1?key=' + GOOGLE_API_KEY + '&cx=b9ccdccf8ab049119&q=' + queryToBeDone

        $.get(url, (data) => {
            result = "\t\tThese are the top 3 search results:\n";
            data.items.splice(3);
            data.items.forEach(res => {
                result += '------------>>' + res.title + '<<------------\n' +
                    'URL: ' + res.link + ' \n' +
                    'Snippet:' + res.snippet + "\n\n";
            });
            toast.info(result, { position: toast.POSITION.BOTTOM_CENTER, closeOnClick: true, autoClose: false, style: { width: '1000px' } });
        });
    }

    const sendMessage = (identifier, toSearch, e) => {
        if (identifier === "@bot1") {
            getWeather(e);
            return;
        } else if (identifier === "@bot2") {
            googleResults(toSearch, e);
            return;
        }
    }

    const decryptMessage = (message) => {
        var objectBytes = AES.decrypt(message.message, "E1F53135E559C253WE12FACF2FF");
        let decrypted;
        if (message.type === "string") {
            decrypted = objectBytes.toString(enc.Utf8);
        } else {
            decrypted = JSON.parse(objectBytes.toString(enc.Utf8));
        }

        return decrypted;
    }

    const removeAccents = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    const toDatetimeLocalString = (dateObject) => {
        /*
        *This method converts a Date object into a string with this format:
        *"1970-01-01T00:00:00.0"
        */
        let datetime_local;

        //----------------Date formating--------
        let dd = dateObject.getDate();
        if (dateObject.getDate() < 10) {
            dd = "0" + dd;
        }
        let mm = dateObject.getMonth() + 1;
        if (dateObject.getMonth() < 10) {
            mm = "0" + mm;
        }
        let aaaa = dateObject.getFullYear();

        let date = aaaa + "-" + mm + "-" + dd;

        datetime_local = date;
        return datetime_local;
    }

    const messageBrowser = () => {
        var filteredList = [];
        if (searchValue !== "") {
            var searchText = removeAccents(searchValue.toLowerCase());
            filteredList = listMessage.filter((message) => {
                var decrypted = decryptMessage(message);
                if (message.type === "string") {
                    var messageContent = removeAccents(decrypted).toLowerCase();
                    if (messageContent.includes(searchText)) {
                        return message;
                    }
                }
                else {
                    var urlInLowerCase = decrypted.urlFile.toLowerCase();
                    if (urlInLowerCase.includes(searchText)) {
                        return message;
                    }
                }
                return null;
            });
            setlistFilteredMessage(filteredList);
        } else if (dateSearchValue) {
            //Search by the date of the message
            var dateEntered = toDatetimeLocalString(dateSearchValue);
            filteredList = listMessage.filter((message) => {
                var messageDateWithOutTime = String(message.date).slice(0, 10);
                if (dateEntered === messageDateWithOutTime) {
                    return message;
                }
                return null;
            });
            setlistFilteredMessage(filteredList);
        }
    }

    return (
        <div className='Chatbox'>
            {docRef ?
                (<><Modals open={showModal} onClose={setShowModal} onSetFiles={setListFiles} uploadValue={uploadValue} messageFile={messageFile} onSendFiles={onSendFiles} />
                    <div className='chatbox-info-container'>
                        {(sender?.user1.uid === userCredential?.uid) ? (
                            <div className='chatbox-info-data'>
                                <div className='chatbox-info-photo-name'>
                                    <div className='chatbox-info-pn'>
                                        <img className='sidebar-image-perfil' src={sender?.user2.photoURL} alt="Perfil" />
                                    </div>
                                    <div className='chatbox-info-container-div-name'>
                                        <h3>{sender?.user2.name}</h3>
                                    </div>
                                </div>
                                <div className="chatbox-search-block">
                                    <div className='chatbox-filter-setting'>
                                        <input value={searchValue} onChange={(e) => {
                                            e.preventDefault();
                                            setSearchValue(e.target.value);
                                            messageBrowser();
                                        }}
                                            type='text' className='chatbox-search-input' placeholder='Search' />

                                        <Datetime dateReminder={setDateSearchValue} className="drop-file-form-input" styles={{ color: "white" }} />
                                        <RiDeleteBack2Line className='chatbox-delete-filter' onClick={() => { setDateSearchValue(""); setSearchValue("") }} />
                                        <BiSearchAlt className='chatbox-search-filter' onClick={() => messageBrowser()} />
                                        <div>
                                            <TbLock
                                                onClick={() => {
                                                    onBlockUser();
                                                }} className='chatbox-block-user' />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className='chatbox-info-data'>
                                <div className='chatbox-info-photo-name'>
                                    <div className='chatbox-info-pn'>
                                        <img className='sidebar-image-perfil' src={sender?.user1.photoURL} alt="Perfil" />
                                    </div>
                                    <div className='chatbox-info-container-div-name'>
                                        <h3>{sender?.user1.name}</h3>
                                    </div>
                                </div>
                                <div className="chatbox-search-block">
                                    <div className='chatbox-filter-setting'>
                                        <input value={searchValue} onChange={(e) => {
                                            e.preventDefault();
                                            setSearchValue(e.target.value);
                                            messageBrowser();
                                        }}
                                            type='text' className='chatbox-search-input' placeholder='Search' />

                                        <Datetime dateReminder={setDateSearchValue} className="drop-file-form-input" styles={{ color: "white" }} />
                                        <i onClick={() => { setDateSearchValue(""); setSearchValue("") }} />
                                        <BiSearchAlt className='chatbox-search-filter' onClick={() => messageBrowser()} />
                                    </div>
                                    <div>
                                        <TbLock
                                            onClick={() => {
                                                onBlockUser();
                                            }} className='chatbox-block-user' />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className='chatbox-container'>
                        <ScrollToBottom className='chatbox-scroll-container'>
                            {(!searchValue ? (!dateSearchValue ? (listMessage.map((message, index) => {
                                var objectBytes = AES.decrypt(message.message, "E1F53135E559C253WE12FACF2FF");
                                let decrypted;

                                if (message.type === "string") {
                                    decrypted = objectBytes.toString(enc.Utf8);
                                } else {
                                    decrypted = JSON.parse(objectBytes.toString(enc.Utf8));
                                }

                                if (message.uid === userCredential.uid) {
                                    return (

                                        <div key={index} className='chatbox-message-user'>
                                            <FaEdit
                                                onClick={() => {
                                                    setEditMessage(decrypted);
                                                    setEditMessageObj(message);
                                                }} className='chatbox-edit' />
                                            <MdOutlineAutoDelete className='chatbox-autodelete' />
                                            <AiFillDelete
                                                onClick={() => {
                                                    onDelete(message);
                                                }} className='chatbox-delete' />
                                            {
                                                (message.type === "string" ? (<span className='chatbox-message-incoming'>{decrypted}<p>{message.date}</p></span>) :
                                                    (decrypted.typeFile === "image" ? (<><img className='chatbox-message-files' src={decrypted.urlFile} alt="A" /><p>{message.date}</p></>) :
                                                        (decrypted.typeFile === "audio" ? (<><audio className='chatbox-message-files-audio' controls src={decrypted.urlFile} type="audio/*" /><p>{message.date}</p></>) :
                                                            (decrypted.typeFile === "video" ? (<><video width="320" height="240" controls src={decrypted.urlFile} type="video/*" /> <p>{message.date}</p></>) :
                                                                (<object className='chatbox-message-files-other' data={decrypted.urlFile} type="application/OtherFile">
                                                                    <h6>Download the file in the following link: <a href={decrypted.urlFile}> Here </a></h6><p>{message.date}</p></object>)))))
                                            }
                                        </div>
                                    )
                                } else {
                                    return (
                                        <div key={index} className='chatbox-incoming-message-user'>
                                            {
                                                (message.type === "string" ? (<span className='chatbox-message-incoming'>{decrypted}<p>{message.date}</p></span>) :
                                                    (decrypted.typeFile === "image" ? (<><img className='chatbox-message-files' src={decrypted.urlFile} alt="A" /><p>{message.date}</p></>) :
                                                        (decrypted.typeFile === "audio" ? (<><audio className='chatbox-message-files-audio' controls src={decrypted.urlFile} type="audio/*" /><p>{message.date}</p></>) :
                                                            (decrypted.typeFile === "video" ? (<><video width="320" height="240" controls src={decrypted.urlFile} type="video/*" /> <p>{message.date}</p></>) :
                                                                (<object className='chatbox-message-files-other' data={decrypted.urlFile} type="application/OtherFile">
                                                                    <h6>Download the file in the following link: <a href={decrypted.urlFile}> Here </a></h6><p>{message.date}</p></object>)))))
                                            }
                                        </div>
                                    )
                                }
                            })) : (
                                listFilteredMessage.map((message, index) => {
                                    var objectBytes = AES.decrypt(message.message, "E1F53135E559C253WE12FACF2FF");
                                    let decrypted;

                                    if (message.type === "string") {
                                        decrypted = objectBytes.toString(enc.Utf8);
                                    } else {
                                        decrypted = JSON.parse(objectBytes.toString(enc.Utf8));
                                    }

                                    if (message.uid === userCredential.uid) {
                                        return (
                                            <div key={index} className='chatbox-message-user'>
                                                <FaEdit
                                                    onClick={() => {
                                                        setEditMessage(decrypted);
                                                        setEditMessageObj(message);
                                                    }} className='chatbox-edit' />
                                                <MdOutlineAutoDelete className='chatbox-autodelete' />
                                                <AiFillDelete
                                                    onClick={() => {
                                                        onDelete(message);
                                                    }} className='chatbox-delete' />
                                                {
                                                    (message.type === "string" ? (<span className='chatbox-message-incoming'>{decrypted}<p>{message.date}</p></span>) :
                                                        (decrypted.typeFile === "image" ? (<><img className='chatbox-message-files' src={decrypted.urlFile} alt="A" /><p>{message.date}</p></>) :
                                                            (decrypted.typeFile === "audio" ? (<><audio className='chatbox-message-files-audio' controls src={decrypted.urlFile} type="audio/*" /><p>{message.date}</p></>) :
                                                                (decrypted.typeFile === "video" ? (<><video width="320" height="240" controls src={decrypted.urlFile} type="video/*" /> <p>{message.date}</p></>) :
                                                                    (<object className='chatbox-message-files-other' data={decrypted.urlFile} type="application/OtherFile">
                                                                        <h6>Download the file in the following link: <a href={decrypted.urlFile}> Here </a></h6><p>{message.date}</p></object>)))))
                                                }
                                            </div>
                                        )
                                    } else {
                                        return (
                                            <div key={index} className='chatbox-incoming-message-user'>
                                                {
                                                    (message.type === "string" ? (<span className='chatbox-message-incoming'>{decrypted}<p>{message.date}</p></span>) :
                                                        (decrypted.typeFile === "image" ? (<><img className='chatbox-message-files' src={decrypted.urlFile} alt="A" /><p>{message.date}</p></>) :
                                                            (decrypted.typeFile === "audio" ? (<><audio className='chatbox-message-files-audio' controls src={decrypted.urlFile} type="audio/*" /><p>{message.date}</p></>) :
                                                                (decrypted.typeFile === "video" ? (<><video width="320" height="240" controls src={decrypted.urlFile} type="video/*" /> <p>{message.date}</p></>) :
                                                                    (<object className='chatbox-message-files-other' data={decrypted.urlFile} type="application/OtherFile">
                                                                        <h6>Download the file in the following link: <a href={decrypted.urlFile}> Here </a></h6><p>{message.date}</p></object>)))))
                                                }
                                            </div>
                                        )
                                    }
                                })
                            )) : (
                                listFilteredMessage.map((message, index) => {
                                    var objectBytes = AES.decrypt(message.message, "E1F53135E559C253WE12FACF2FF");
                                    let decrypted;

                                    if (message.type === "string") {
                                        decrypted = objectBytes.toString(enc.Utf8);
                                    } else {
                                        decrypted = JSON.parse(objectBytes.toString(enc.Utf8));
                                    }

                                    if (message.uid === userCredential.uid) {
                                        return (
                                            <div key={index} className='chatbox-message-user'>
                                                <FaEdit
                                                    onClick={() => {
                                                        setEditMessage(decrypted);
                                                        setEditMessageObj(message);
                                                    }} className='chatbox-edit' />
                                                <MdOutlineAutoDelete className='chatbox-autodelete' />
                                                <AiFillDelete
                                                    onClick={() => {
                                                        onDelete(message);
                                                    }} className='chatbox-delete' />
                                                {
                                                    (message.type === "string" ? (<span className='chatbox-message-incoming'>{decrypted}<p>{message.date}</p></span>) :
                                                        (decrypted.typeFile === "image" ? (<><img className='chatbox-message-files' src={decrypted.urlFile} alt="A" /><p>{message.date}</p></>) :
                                                            (decrypted.typeFile === "audio" ? (<><audio className='chatbox-message-files-audio' controls src={decrypted.urlFile} type="audio/*" /><p>{message.date}</p></>) :
                                                                (decrypted.typeFile === "video" ? (<><video width="320" height="240" controls src={decrypted.urlFile} type="video/*" /> <p>{message.date}</p></>) :
                                                                    (<object className='chatbox-message-files-other' data={decrypted.urlFile} type="application/OtherFile">
                                                                        <h6>Download the file in the following link: <a href={decrypted.urlFile}> Here </a></h6><p>{message.date}</p></object>)))))
                                                }
                                            </div>
                                        )
                                    } else {
                                        return (
                                            <div key={index} className='chatbox-incoming-message-user'>
                                                {
                                                    (message.type === "string" ? (<span className='chatbox-message-incoming'>{decrypted}<p>{message.date}</p></span>) :
                                                        (decrypted.typeFile === "image" ? (<><img className='chatbox-message-files' src={decrypted.urlFile} alt="A" /><p>{message.date}</p></>) :
                                                            (decrypted.typeFile === "audio" ? (<><audio className='chatbox-message-files-audio' controls src={decrypted.urlFile} type="audio/*" /><p>{message.date}</p></>) :
                                                                (decrypted.typeFile === "video" ? (<><video width="320" height="240" controls src={decrypted.urlFile} type="video/*" /> <p>{message.date}</p></>) :
                                                                    (<object className='chatbox-message-files-other' data={decrypted.urlFile} type="application/OtherFile">
                                                                        <h6>Download the file in the following link: <a href={decrypted.urlFile}> Here </a></h6><p>{message.date}</p></object>)))))
                                                }
                                            </div>
                                        )
                                    }
                                })
                            ))}
                        </ScrollToBottom>
                    </div>

                    <form onSubmit={onSend} className='chatbox-form-container'>
                        <div className='chatbox-form-div'>
                            {blockChatCondition === false ?
                                (<div>
                                    {editMessage && (
                                        <div className='chatbox-edit-div'>
                                            <span className='chatbox-snap-edit'>
                                                {editMessage}
                                            </span>
                                            <div className='chatbox-edit-div-x'>
                                                <MdClose
                                                    onClick={() => {
                                                        setEditMessage("");
                                                        setEditMessageObj("");
                                                    }} className='chatbox-close-edit' />
                                            </div>
                                        </div>
                                    )}
                                    <div className='chatbox-send-message'>
                                        <div onClick={() => {
                                            setShowModal(true);
                                        }}
                                            className='chatbox-form-button'>
                                            <BsPaperclip className='chatbox-adjunt' />
                                        </div>
                                        <div className='chatbox-form-div-container'>
                                            <input value={value} onChange={(e) => {
                                                e.preventDefault();
                                                setValue(e.target.value);
                                            }} type='text' className='chatbox-form-input' placeholder='Enviar mensaje' />
                                        </div>
                                        <div onClick={(e) => {
                                            var botText = value.substring(0, 5);
                                            var searchText = value.substring(6, value.length);
                                            if (botText === '@bot1' || botText === '@bot2') {
                                                if (value) {
                                                    sendMessage(botText, searchText, e);
                                                }
                                            } else {
                                                onSend(e);
                                            }
                                        }} className='chatbox-form-button'>
                                            <RiSendPlaneFill className='chatbox-send' />
                                        </div>

                                    </div>
                                </div>) : (<div className='chatbox-block-chat'>
                                    <span>
                                        Loading...
                                    </span>
                                </div>)}
                        </div>
                    </form></>) : (<>
                        <div className='chatbox-chat-container'>
                            <img src="./rizemail.png" alt="" />
                        </div>
                    </>)
            }
        </div>
    )
}

export default Chatbox;