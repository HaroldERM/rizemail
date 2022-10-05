import Login from '../components/Login';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Main from './main/Main';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { bindActionCreators } from 'redux';
import { authActions } from '../state';
import '../styles/App.css';

function App() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.userCredentials);

  const [firstLoad, setFirstLoad] = useState(false);
  const setUnsubscribe = useState().at(1);

  const dispatch = useDispatch();
  const { getSession } = bindActionCreators(authActions, dispatch);

  useEffect(() => {
    //console.log(user);
    user ? navigate("/rizemail") : navigate("/")
  }, [navigate, user]);

  useEffect(() => {
    if (!firstLoad) {
      setUnsubscribe(
        onAuthStateChanged(auth, (userCredentials) => {
          if (userCredentials) {
            console.log(userCredentials);
            getSession(userCredentials.uid);
          }
          setFirstLoad(true);
        })
      );
    }
  }, [firstLoad, setUnsubscribe, getSession]);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/rizemail" element={<Main />} />
      </Routes>
    </div>
  );
}

export default App;
