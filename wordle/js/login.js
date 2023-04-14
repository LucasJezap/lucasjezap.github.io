function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/auth/login', {login: user, password: pass})
    .then(response => response.json())
    .then(response => {
      if (response.status === 200) {
        setLocalStorageElement("player_id", response.data.id)
        window.location.assign("mainPage.html");
      } else {
        document.getElementById('failed').innerHTML = "Wrong credentials"
      }
    })
    .catch((err) => console.debug(err));
}

function register() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const pass2 = document.getElementById('password2').value;

  if (pass !== pass2) {
    document.getElementById('failed').innerHTML = "Passwords do not match"
    return
  }

  get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/auth/create', {login: user, password: pass})
    .then(response => response.json())
    .then(response => {
      if (response.status === 200) {
        window.location.assign("index.html");
      } else {
        document.getElementById('failed').innerHTML = "Username already used"
      }
    })
    .catch((err) => console.debug(err));
}

function lost_password() {
  const user = document.getElementById('username').value;

  get('http://ec2-54-93-222-115.eu-central-1.compute.amazonaws.com:8080/auth/lostpassword', {login: user})
    .then(response => response.json())
    .then(response => {
      if (response.status === 200) {
        document.getElementById('password').value = response.data.password
        document.getElementById('failed').innerHTML = ""
      } else {
        document.getElementById('password').value = ""
        document.getElementById('failed').innerHTML = "Username does not exist"
      }
    })
    .catch((err) => console.debug(err));
}

function show() {
  const button = document.getElementById('button');
  const pass = document.getElementById('password');
  if (pass.type === "password") {
    button.innerText = "Hide"
    pass.type = "text";
  } else {
    button.innerText = "Show"
    pass.type = "password";
  }

}
