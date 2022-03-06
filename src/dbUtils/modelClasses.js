class User {
    constructor(id, name, email, salt, hashedpassword) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.salt = salt;
        this.hashedpassword = hashedpassword;
    }
}

module.exports = { User };