import React from "react";
import styles from "./Chat.module.css";
import { useLocation } from "react-router-dom";


import { db } from "../../firebase";
import { doc, getDocs, collection, setDoc, onSnapshot, query, where, orderBy } from "firebase/firestore";


const Chat = () => {

    const [contents, setContents] = React.useState([]);
    
    const { state } = useLocation();
    const userRoomList = React.useRef([]);
    
    

    React.useEffect(()=>{
    
        // 실시간 감시 온스냅샷이 최초 한번실행되는
        // useEffect 밖에 있으면 useState 에서 set 사용시 리랜더링이 발생하고
        // 그럼 다시 온스냅샷이 다시 발생한다. 그렇게 무한 루프가 생김.
        // 그래서 온스냅샷 위치를 최초 한번 실행되는 useEffect 로 넣으면 
        // 최초 한번 실행하고 실시간 감지해서 데이터 값이 추가되거나 바뀌면
        // 그 값을 useState 에 set 하고 그럼 다시 Chat function component를 리랜더링
        // 하게 되는데 온스냅샷은 최초 한번 실행되는 useEffect 안에 있어서 다시 발생하지 않는다.
        const unsubscribe = onSnapshot(
            collection(db, "rooms/room1/msges"),
            (snapshot) => {

              snapshot.docChanges().forEach((change) => {

                const source = change.doc.metadata.hasPendingWrites ? "Local" : "Server";
                console.log(source);

                if (change.type === "added" && "Server" === source) {
                    //console.log("New city: ", change.doc.data());

                    setContents((prevState)=>{
                        return [...prevState,
                            { 
                                chat: change.doc.data().chat,
                                from: change.doc.data().from, 
                                time: change.doc.data().time,
                                date: change.doc.data().date,
                                email: change.doc.data().email,
                                order: change.doc.data().order
                            } 
                        ]
                    })
                    
                }
                if (change.type === "modified") {
                    //console.log("Modified city: ", change.doc.data());
                }
                if (change.type === "removed") {
                    //console.log("Removed city: ", change.doc.data());
                }
                
              });
        
            },
            (error) => {
              // ...
              console.log("=========error============");
              console.log(error);
        });

    },[]);



    
    React.useEffect( () => {

        const q = query(collection(db, "users"), where("email", "==", state.email));
        const qq = query(collection(db, "rooms/room1/msges"), orderBy("order"));

        async function chatList(){

            const query = await getDocs(q);

            //해당 email 유저가 있다면 채팅 리스트 불러옴.
            if ( 1 === query.size ){ 
                
                query.forEach((doc) => {
                    
                    if ( "" !== doc.data().roomList ) {
                        userRoomList.current = doc.data().roomList.split(",");
                    }
                    
                });

            //해당 email 유저가 없다면 만들어줌.    
            } else if ( 0 === query.size ){ 
                // ==================================
                // firebase 유저 채팅 리스트 push
                // ==================================
                const usersRef = collection(db, "users");
                await setDoc(doc(usersRef, state.email), {
                    email: state.email,
                    roomList: ""
                });
            }

            //채팅 리스트가 없다면 리턴.
            if ( 0 === userRoomList.length ) {
                return
            }

            const list = [];

            // ==================================
            // firebase 채팅 리스트 불러오기
            // ==================================

            //const querySnapshot = await getDocs(collection(db, "rooms/room1/msges"));
            const querySnapshot = await getDocs(qq);
            querySnapshot.forEach((doc) => {

                list.push({
                    chat: doc.data().chat,
                    time: doc.data().time,
                    email: doc.data().email,
                    from: doc.data().from,
                    date: doc.data().date,
                    order: doc.data().order
                });

            });
            
            setContents(list);

        }
        chatList();

    },[]);

    
    const onKeyDown = async (e) => {

        if ( "Enter" === e.key && "" !== e.target.value ){

            const date = new Date();
            
            const hours = date.getHours() > 12 ? "오후 "+(date.getHours()-12) : "오전 " + date.getHours();
            const minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
            
            const year = date.getFullYear();
            const month = date.getMonth()+1;
            const day = date.getDate();

            const msgSize = contents.length+1;

            //local 내가 쓴 글 작업.
            setContents((contents)=>{
                return[
                    ...contents,
                    { 
                        chat: e.target.value,
                        from: state.displayName, 
                        time: hours + ":" + minutes,
                        date: year+"-"+month+"-"+day,
                        email: state.email,
                        order: msgSize
                    }
                ]
            })
            
            //상대방과 최초 대화시 방 만들어주기.
            if ( 1 === msgSize ){
                
                // ==================================
                // firebase 유저 채팅 리스트 push
                // ==================================
                const usersRef = collection(db, "users");
                await setDoc(doc(usersRef, state.email), {
                    email: state.email,
                    roomList: "room1"
                });


                // ==================================
                // firebase 상대방 채팅 리스트 push
                // ==================================
                const usersRef2 = collection(db, "users");
                await setDoc(doc(usersRef2, "chichyony@gmail.com"), {
                    email: "chichyony@gmail.com",
                    roomList: "room1"
                });

            }


            // firebase 채팅 push
            const roomsRef = collection(db, "rooms/"+ (0 === userRoomList.current.length ? "room1" : "room1") +"/msges");
            await setDoc(doc(roomsRef, "msg"+msgSize), {
                chat: e.target.value,
                from: state.displayName, 
                time: hours + ":" + minutes, 
                date: year+"-"+month+"-"+day,
                email: state.email,
                order: msgSize
            });

            //텍스트창 초기화
            e.target.value = "";

            
        }

    }

    const mainRef = React.useRef();
    const inputRef = React.useRef();
    

    //최신 채팅 업데이드 시 스크롤 하단으로 이동.
    React.useEffect(()=>{
        
        const chatScroll = document.getElementById("main_div_chat");
        chatScroll.scrollTop = mainRef.current.scrollHeight;

    },[contents]); //[contents] 가 바뀔때마다 이벤트 발생.


    return(
        <main className={styles.main_border_css} >
            <header className={styles.header_css}>
                <h2 className={styles.test}>방 title</h2>
            </header>
            <main id="main_div_chat" className={styles.main_css} ref={mainRef}>
                {
                    contents.map( (obj, index) => {
                        return <ChatListUi obj={obj} key={index} email={state.email} contents={contents} />
                    })
                    
                }
            </main>
            <footer className={styles.footer_css}>
                <input 
                className={styles.input_css} 
                onKeyDown={onKeyDown} 
                ref={inputRef} 
                maxLength="45"
                />
            </footer>
        </main>
    )
}

const ChatListUi = ({obj, email, contents}) => {
    
    return(

        <>
            { obj.date !== (contents[obj.order-2] === undefined ? "" : contents[obj.order-2].date ) ? 
            <div style={{
                "textAlign": "center",
                "padding": "80px"
            }}>
                <b style={{
                    "backgroundColor":"#cecece",
                    "borderRadius":"15px",
                    "padding":"10px"
                }}>
                    { obj.date }
                </b>
            </div>
            :
            ""
            }

            { email === obj.email ?
            <div className={styles.div_css}>
                <p className={styles.p_date_css}>
                    {obj.time}
                </p>
                <p className={styles.p_contents_css}>
                    {obj.chat}
                </p>
            </div>
            :
            <div className={styles.div_css_op}>
                <img className={styles.img_profile} src="./img/img_profile.png" alt=""/>
                <p className={styles.p_contents_css_op}>
                    {obj.chat}
                </p>
                <p className={styles.p_date_css_op}>
                    {obj.time}
                </p>
            </div>
            }
        </>
        
    )
}


export default Chat;