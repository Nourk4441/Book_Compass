const form = [...document.querySelector('.modal-content').children];

form.forEach((item, i) => {
    setTimeout(() => {
        item.style.opacity = '1';
    }, i * 100);
});

document.addEventListener('DOMContentLoaded', () => {
    const name = document.querySelector('.name') || null;
    const email = document.querySelector('.email');
    const password = document.querySelector('.password');
    const submitBtn = document.querySelector('.submit-btn');
    const cancelBtn=document.querySelector('.cancelbtn');

    if (name === null) { // login page
        submitBtn.addEventListener('click', () => {
            fetch('/login-user', {
                method: 'post',
                headers: new Headers({'Content-Type': 'application/json'}),
                body: JSON.stringify({
                    email: email.value,
                    password: password.value
                })
            })
            .then(res => res.json())
            .then(data => {
                validateData(data,'login');
            }).catch(err => {
                console.error('Error during login:', err);
                alertBox('An error occurred during login.');
            });
        });
    } else { // signup page
        submitBtn.addEventListener('click', () => {
            fetch('/register-user', {
                method: 'post',
                headers: new Headers({'Content-Type': 'application/json'}),
                body: JSON.stringify({
                    name: name.value,
                    email: email.value,
                    password: password.value
                })
            })
            .then(res => res.json())
            .then(data => {
                validateData(data,'register');
            }).catch(err => {
                console.error('Error during registration:', err);
                alertBox('An error occurred during registration.');
            });
        });
    }
    cancelBtn.onclick = () => {
        sessionStorage.clear();
        location.reload();
    };
});


const validateData = (data,action) => {
    if (!data.name) {
        alertBox(data);
    } else {
        sessionStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem('user_name', data.name);
        sessionStorage.setItem('user_email', data.email);
        sessionStorage.setItem('user_action', action); 
        window.location.href = 'welcome.html';
    }
};

const alertBox=(data)=>{
    const alretContainer= document.querySelector('.alert-box');
    const alertMsg=document.querySelector('.alert');
    alertMsg.innerHTML=data

    alretContainer.style.top=`5%`;
    setTimeout(()=>{
        alretContainer.style.top=null; 
    },5000)
}


window.onload=()=>{

    if (sessionStorage.getItem('user_id')) {
        window.location.href = 'welcome.html';
    }
}

