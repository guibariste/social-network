package main

//  et voir ses amis et son nombre d'amis
import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

var (
	utilisateur string
	connecte    bool
)

// finir la fonction connect user
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type InsertResult struct {
	Err    error
	Result string
	Accept bool
}
type Groupe struct {
	Id          string   `json:"id`
	Nom         string   `json:"nom"`
	Statut      string   `json:"statut"`
	Utilisateur string   `json:"utilisateur"`
	Invites     []string `json:"invites"`
	Description string   `json:"description"`
	Createur    string   `json:"createur"`

	TypeDemande string   `json:"typeDemande"`
	DemandesExt []string `json:"demandesExt"`
}
type RechGroupe struct {
	Id  string `json:"id`
	Nom string `json:"nom"`

	Description string `json:"description"`
	Createur    string `json:"createur"`
}
type Post struct {
	Id         int       `json:"id"`
	Message    string    `json:"message"`
	Image      string    `json:"image"`
	Visibility string    `json:"visibility"`
	Username   string    `json:"username"`
	Comments   []Comment `json:"comments"`
}

type PrivateMessage struct {
	Id         int    `json:"id"`
	Sender     string `json:"sender"`
	SenderId   string `json:"sender_id"`
	Receiver   string `json:"receiver"`
	ReceiverId string `json:"receiver_id"`
	Content    string `json:"content"`
	Date       string `json:"date"`
}

type GroupMessage struct {
	Id       int    `json:"id"`
	Sender   string `json:"sender"`
	SenderId string `json:"sender_id"`
	GroupId  string `json:"group_id"`
	Content  string `json:"content"`
	Date     string `json:"date"`
}

type Amis struct {
	ListeAmis []string `json:"liste_amis"`
	NbreAmis  int      `json:"num_amis"`
}
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}
type User struct {
	Id        string `json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Anniv     string `json:"anniv"`
	Avatar    string `json:"avatar"`
	Surnom    string `json:"surnom"`
	Propos    string `json:"propos"`
	IsPublic  bool   `json:"isPublic"`
	Followers string `json:"followers"`
	Followed  string `json:"followed"`
	Pending   string `json:"pending"`
}

type AuthUser struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type GroupEvent struct {
	ID           int               `json:"id"`
	Creator      string            `json:"creator"`
	Title        string            `json:"title"`
	Description  string            `json:"description"`
	Date         string            `json:"date"`
	StartDate    string            `json:"startDate"`
	EndDate      string            `json:"endDate"`
	OptionsNotif []int             `json:"optionsNotif"`
	GroupID      string            `json:"group_id"`
	Option1      string            `json:"option1"`
	Option2      string            `json:"option2"`
	Option3      string            `json:"option3"`
	Option4      string            `json:"option4"`
	UserAnswers  map[string]string `json:"userAnswers"`
}

// ----------------------DIVERS------------------------
func convertId(user string) string {
	var result string
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	query := "SELECT id,nom  FROM users"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var id string

		var nom string

		err := rows.Scan(&id, &nom)
		if err != nil {
			log.Fatal(err)
		}
		if user == id {
			result = nom
		}
		if err = rows.Err(); err != nil {
			log.Fatal(err)
		}

	}
	return result
}

func convertStringToId(user string) int {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return 0
	}
	defer db.Close()
	querys := "SELECT id FROM users WHERE nom = ?"
	var userId int
	err = db.QueryRow(querys, user).Scan(&userId)
	if err != nil {
		return 0
	}
	return userId
}

//-------------------GROUPE---------------------------------

func acceptDemandeExt(persAccepte string, nomGroupe string) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Préparation de la requête
	stmt, err := db.Prepare("UPDATE groupeUsers SET statut = 'accepte',role = 'invite' WHERE utilisateur = ? AND nomGroupe = ? AND role = 'autoInvit' AND statut = 'attente'")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(convertStringToId(persAccepte), nomGroupe)
	if err != nil {
		log.Fatal(err)
	}
}

func refuseDemandeExt(persAccepte string, nomGroupe string) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Préparation de la requête
	stmt, err := db.Prepare("UPDATE groupeUsers SET statut = 'refuse',role = 'invite' WHERE utilisateur = ? AND nomGroupe = ? AND role = 'autoInvit' AND statut = 'attente'")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(convertStringToId(persAccepte), nomGroupe)
	if err != nil {
		log.Fatal(err)
	}
}

func insertGroupe(groupe Groupe) InsertResult {
	var result InsertResult
	t := time.Now()

	date := t.Format("2006-01-02 15:04:05")
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		result.Err = err
		return result
	}
	defer db.Close()

	// Vérifier si le groupe avec le même nom existe déjà
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM groupe WHERE nomGroupe = ?", groupe.Nom).Scan(&count)
	if err != nil {
		result.Err = err
		return result
	}
	if count > 0 {
		result.Accept = false
		return result
	}

	stmt, err := db.Prepare("INSERT INTO groupe (nomGroupe,description,createur) VALUES (?,?,?)")
	if err != nil {
		result.Err = err
		return result
	}
	defer stmt.Close()

	res, err := stmt.Exec(groupe.Nom, groupe.Description, groupe.Createur)
	if err != nil {
		result.Err = err
		return result
	}
	groupid, _ := res.LastInsertId()
	// fmt.Println(groupid)
	stmte, err := db.Prepare("INSERT INTO groupeUsers(nomGroupe,utilisateur,role,statut) VALUES (?,?,?,?)")
	if err != nil {
		result.Err = err
		return result
	}
	defer stmte.Close()
	stmtes, err := db.Prepare("INSERT INTO notifications(type,sender,receiver,groupid,date) VALUES (?,?,?,?,?)")
	if err != nil {
		result.Err = err
		return result
	}
	defer stmte.Close()
	defer stmtes.Close()
	for _, invite := range groupe.Invites {
		_, err = stmtes.Exec("invitGroupe", groupe.Createur, convertId(invite), groupid, date)
		if err != nil {
			result.Err = err
			break
		}
		_, err = stmte.Exec(groupe.Nom, invite, "invite", "attente")
		if err != nil {
			result.Err = err
			break
		}
	}

	result.Accept = true
	return result
}
func insertInvites(groupe Groupe) InsertResult {
	var result InsertResult
	// t := time.Now()

	// date := t.Format("2006-01-02 15:04:05")
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		result.Err = err
		return result
	}
	defer db.Close()

	stmte, err := db.Prepare("INSERT INTO groupeUsers(nomGroupe,utilisateur,role,statut) VALUES (?,?,?,?)")
	if err != nil {
		result.Err = err
		return result
	}
	defer stmte.Close()

	for _, invite := range groupe.Invites {

		_, err = stmte.Exec(groupe.Nom, invite, "invite", "attente")
		if err != nil {
			result.Err = err
			break
		}
	}

	result.Accept = true
	return result
}
func accepterGroupe(user string) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Préparation de la requête
	stmt, err := db.Prepare("UPDATE groupeUsers SET statut = 'accepte' WHERE utilisateur = ? AND statut = 'attente'")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(convertStringToId(user))
	if err != nil {
		log.Fatal(err)
	}
}

func dejaGroupe(user string) []string { // pour pas que celui qui recherche un groupe tombe dans un quil est deja
	var nomGroupe []string
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	querys := "SELECT nomGroupe,utilisateur  FROM groupeUsers"
	rowse, err := db.Query(querys)
	if err != nil {
		log.Fatal(err)
	}
	defer rowse.Close()

	// Parcourir les résultats de la requête pour la première fois
	for rowse.Next() {
		var nom string
		var users string

		err := rowse.Scan(&nom, &users)
		if err != nil {
			log.Fatal(err)
		}
		if convertId(users) == user {
			nomGroupe = append(nomGroupe, nom)
		}

	}
	return nomGroupe
}
func notInGroup(user string, nomGroupe string) bool { // pour pas que celui qui recherche un groupe tombe dans un quil est deja

	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	querys := "SELECT nomGroupe,utilisateur  FROM groupeUsers"
	rowse, err := db.Query(querys)
	if err != nil {
		log.Fatal(err)
	}
	defer rowse.Close()

	// Parcourir les résultats de la requête pour la première fois
	for rowse.Next() {
		var nom string
		var users string

		err := rowse.Scan(&nom, &users)
		if err != nil {
			log.Fatal(err)
		}
		if convertId(users) == user && nomGroupe == nom {
			return true
		}

	}
	return false
}

func rechercheGroupe(chercheur string) []RechGroupe {
	var grpe RechGroupe
	var rechGroupe []RechGroupe
	db, err := sql.Open("sqlite3", "./social.db")
	defer db.Close()
	if err != nil {
		log.Fatal(err)
	}
	query := "SELECT id, nomGroupe, description, createur FROM groupe"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var id string
		var nom string
		var description string
		var createur string
		err := rows.Scan(&id, &nom, &description, &createur)
		if err != nil {
			log.Fatal(err)
		}

		// Vérifier si le groupe est déjà dans la liste
		groupeExiste := false
		for _, deja := range dejaGroupe(chercheur) {
			if nom == deja {
				groupeExiste = true
				break
			}
		}
		if groupeExiste {
			continue
		}

		// Ajouter le groupe à la liste de résultats
		if chercheur != createur {
			grpe.Id = id
			grpe.Nom = nom
			grpe.Description = description
			grpe.Createur = createur
			rechGroupe = append(rechGroupe, grpe)
		}
	}
	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
	return rechGroupe
}

func refuserGroupe(user string) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Préparation de la requête
	stmt, err := db.Prepare("UPDATE groupeUsers SET statut = 'refuse' WHERE utilisateur = ? AND statut = 'attente'")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(convertStringToId(user))
	if err != nil {
		log.Fatal(err)
	}
}

func GroupeToID(name string) int {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return 0
	}
	defer db.Close()
	var id int
	err = db.QueryRow("SELECT id FROM groupe WHERE nomGroupe = ?", name).Scan(&id)
	if err != nil {
		fmt.Println(err)
		return 0
	}
	return id
}

func demandeGroupeExt(nom string, receveur string, demandeur string, statut string) InsertResult {
	// il va falloir differencier dans les demandes si c'est une demande de createur ou une demande spontanee

	t := time.Now()

	date := t.Format("2006-01-02 15:04:05")
	var result InsertResult
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	stmte, err := db.Prepare("INSERT INTO groupeUsers(nomGroupe,utilisateur,role,statut) VALUES (?,?,?,?)")
	if err != nil {
		result.Err = err
		return result
	}
	defer stmte.Close()
	stmtes, err := db.Prepare("INSERT INTO notifications(type,sender,receiver,groupid,date) VALUES (?,?,?,?,?)")
	if err != nil {
		result.Err = err
		return result
	}

	defer stmtes.Close()
	_, err = stmte.Exec(nom, convertStringToId(demandeur), statut, "attente")
	if err != nil {
		result.Err = err
	}
	_, err = stmtes.Exec("groupeInvitExt", demandeur, receveur, GroupeToID(nom), date)
	if err != nil {
		result.Err = err
	}
	return result
}

func demandeGroupe(user string) []Groupe {
	var result []Groupe

	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	querys := "SELECT nomGroupe,utilisateur,role,statut FROM groupeUsers"
	rowse, err := db.Query(querys)
	if err != nil {
		log.Fatal(err)
	}
	defer rowse.Close()

	groupes := make(map[string]*Groupe)

	// Parcourir les résultats de la requête pour la première fois

	// il faut differencier les demandes des invitations

	for rowse.Next() {
		var nom string
		var users string
		var statut string
		var role string

		err := rowse.Scan(&nom, &users, &role, &statut)
		if err != nil {
			log.Fatal(err)
		}

		// ca ce sont les invitations
		if convertId(users) == user && role == "invite" {
			groupe, ok := groupes[nom]
			if !ok {
				groupe = &Groupe{Nom: nom}
				groupes[nom] = groupe
			}
			if statut == "attente" {
				groupe.Statut = "attente"
				groupe.Utilisateur = user
				groupe.TypeDemande = "invitation"
			} else if statut == "accepte" {
				groupe.Statut = "accepte"
				groupe.Utilisateur = user
				groupe.TypeDemande = "invitation"

			}
		}
		if convertId(users) == user && role == "autoInvit" {
			groupe, ok := groupes[nom]
			if !ok {
				groupe = &Groupe{Nom: nom}
				groupes[nom] = groupe
			}
			if statut == "attente" {
				groupe.Statut = "attente"
				groupe.Utilisateur = user
				groupe.TypeDemande = "autoInvit"
			} else if statut == "accepte" {
				groupe.Statut = "accepte"
				groupe.Utilisateur = user
				groupe.TypeDemande = "autoInvit"

			}
		}

	}

	// Ajouter les descriptions et les créateurs des groupes
	for _, groupe := range groupes {
		row := db.QueryRow("SELECT groupe.id, description, createur FROM groupe LEFT JOIN groupeUsers ON groupe.nomGroupe = groupeUsers.nomGroupe WHERE groupe.nomGroupe = ? AND groupe.createur = ? GROUP BY groupe.nomGroupe", groupe.Nom, user)
		err := row.Scan(&groupe.Id, &groupe.Description, &groupe.Createur)
		if err != nil {
			if err == sql.ErrNoRows {
				// Le groupe n'a pas de description ou n'a pas été créé par l'utilisateur spécifié
				groupe.Id = ""
				groupe.Description = ""
				groupe.Createur = ""
			} else {
				log.Fatal(err)
			}
		}

		// Requête pour ajouter la description et le créateur du groupe
		row = db.QueryRow("SELECT id, description, createur FROM groupe WHERE nomGroupe = ?", groupe.Nom)
		err = row.Scan(&groupe.Id, &groupe.Description, &groupe.Createur)
		if err != nil {
			if err == sql.ErrNoRows {
				// Le groupe n'a pas de description ou n'a pas été créé par l'utilisateur spécifié
				groupe.Id = ""
				groupe.Description = ""
				groupe.Createur = ""
			} else {
				log.Fatal(err)
			}
		}
	}

	// Parcourir la table groupe pour ajouter les groupes créés par l'utilisateur
	querys = "SELECT id, nomGroupe, description, createur FROM groupe WHERE createur = ?"
	rowsg, err := db.Query(querys, user)
	if err != nil {
		log.Fatal(err)
	}
	defer rowsg.Close()

	for rowsg.Next() {
		var id string
		var nom string
		var description string
		var createur string

		err := rowsg.Scan(&id, &nom, &description, &createur)
		if err != nil {
			log.Fatal(err)
		}

		groupe, ok := groupes[nom]
		if ok {

			groupe.Id = id
			groupe.Nom = nom
			groupe.Description = description
			groupe.Createur = createur
			groupe.Statut = "createur"

		} else {
			var demandeRejoindre []string
			querys = "SELECT utilisateur FROM groupeUsers WHERE nomGroupe = ? AND role = 'autoInvit'"
			rowsge, err := db.Query(querys, nom)
			if err != nil {
				log.Fatal(err)
			}
			defer rowsge.Close()
			for rowsge.Next() {

				var utilisateur string

				err := rowsge.Scan(&utilisateur)
				if err != nil {
					log.Fatal(err)
				}
				demandeRejoindre = append(demandeRejoindre, convertId(utilisateur))
			}

			groupe = &Groupe{
				Id:          id,
				Nom:         nom,
				Description: description,
				Createur:    createur,
				Statut:      "createur",
				DemandesExt: demandeRejoindre,
			}
			groupes[nom] = groupe
		}
	}
	querys = "SELECT nomGroupe, utilisateur FROM groupeUsers WHERE statut = 'accepte' AND nomGroupe IN (SELECT nomGroupe FROM groupe WHERE createur = ?)"
	rowsi, err := db.Query(querys, user)
	if err != nil {
		log.Fatal(err)
	}
	defer rowsi.Close()

	for rowsi.Next() {
		var nom string
		var invite string

		err := rowsi.Scan(&nom, &invite)
		if err != nil {
			log.Fatal(err)
		}

		groupe, ok := groupes[nom]
		if ok {
			groupe.Invites = append(groupe.Invites, convertId(invite))
		}
	}
	for _, groupe := range groupes {
		// Ajouter les utilisateurs acceptés dans le groupe
		if groupe.Statut == "accepte" {
			querys := "SELECT utilisateur FROM groupeUsers WHERE nomGroupe = ? AND statut = 'accepte' AND utilisateur != ?"
			rowsu, err := db.Query(querys, groupe.Nom, user)
			if err != nil {
				log.Fatal(err)
			}
			defer rowsu.Close()

			for rowsu.Next() {
				var utilisateur string

				err := rowsu.Scan(&utilisateur)
				if err != nil {
					log.Fatal(err)
				}

				groupe.Invites = append(groupe.Invites, convertId(utilisateur))
			}
		}
	}
	// Ajouter les groupes à la liste de résultats
	for _, groupe := range groupes {
		result = append(result, *groupe)
	}

	return result
}

//-------------------AMIS----------------------------------

func accepterAmis(receveur string, demandeur string) string {
	receveurInt := convertStringToId(receveur)
	demandeurInt := convertStringToId(demandeur)
	var result string

	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return ""
	}
	defer db.Close()

	// Début de la transaction
	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}
	defer tx.Rollback()

	query := "SELECT demandeur, receveur, statut FROM Amis"
	rows, err := tx.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var user1 int
		var user2 int
		var statut string

		err := rows.Scan(&user1, &user2, &statut)
		if err != nil {
			log.Fatal(err)
		}
		if receveurInt == user2 && demandeurInt == user1 && statut == "attente" {
			result = "true"
		}

		// Mettre à jour la ligne correspondante dans la table Amis
		_, err = tx.Exec("UPDATE Amis SET statut = ? WHERE demandeur = ? AND receveur = ?", "accepte", demandeurInt, receveurInt)
		if err != nil {
			log.Fatal(err)
		}
	}

	// Valider la transaction
	err = tx.Commit()
	if err != nil {
		log.Fatal(err)
	}

	return result
}

func refuserAmis(receveur string, demandeur string) string {
	var result string
	// var demandeurInt int
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return ""
	}
	defer db.Close()
	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}
	defer tx.Rollback()
	query := "SELECT demandeur,receveur,statut FROM Amis"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()
	receveurInt := convertStringToId(receveur)
	demandeurInt := convertStringToId(demandeur)
	// Parcourir les résultats de la requête
	for rows.Next() {
		var user1 int
		var user2 int
		var statut string

		err := rows.Scan(&user1, &user2, &statut)
		if err != nil {
			log.Fatal(err)
		}
		if receveurInt == user2 && demandeurInt == user1 && statut == "attente" {
			result = "true"
		}
		_, err = tx.Exec("UPDATE Amis SET statut = ? WHERE demandeur = ? AND receveur = ?", "refuse", demandeurInt, receveurInt)
		if err != nil {
			panic(err.Error())
		}
	}
	err = tx.Commit()
	if err != nil {
		log.Fatal(err)
	}
	return result
}

func demandeAmis(user string) []string {
	var ensAmis []string
	var ensAmisId []int

	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return ensAmis
	}
	defer db.Close()
	querys := "SELECT id FROM users WHERE nom = ?"
	var userId int
	err = db.QueryRow(querys, user).Scan(&userId)
	if err != nil {
		return ensAmis
	}

	query := "SELECT demandeur,receveur,statut FROM Amis"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var user1 int
		var user2 int
		var statut string

		err := rows.Scan(&user1, &user2, &statut)
		if err != nil {
			log.Fatal(err)
		}
		if userId == user2 && statut == "attente" {
			ensAmisId = append(ensAmisId, user1)
		}

	}
	ensAmis = convertIdAmis(ensAmisId)
	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}

	return ensAmis
}

func convertIdAmis(user []int) []string {
	var result []string
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return result
	}
	defer db.Close()

	query := "SELECT id,prenom,nom  FROM users"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var id int
		var prenom string
		var nom string

		err := rows.Scan(&id, &prenom, &nom)
		if err != nil {
			log.Fatal(err)
		}
		for i := range user {
			if user[i] == id {
				result = append(result, prenom+" "+nom)
			}
		}
		if err = rows.Err(); err != nil {
			log.Fatal(err)
		}

	}
	return result
}

func voirAmis(user string) []string {
	var ensAmis []string
	var ensAmisId []int

	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return ensAmis
	}
	defer db.Close()
	querys := "SELECT id FROM users WHERE nom = ?"
	var userId int
	err = db.QueryRow(querys, user).Scan(&userId)
	if err != nil {
		return ensAmis
	}
	fmt.Print(userId)
	query := "SELECT demandeur,receveur,statut FROM Amis"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var user1 int
		var user2 int
		var statut string

		err := rows.Scan(&user1, &user2, &statut)
		if err != nil {
			log.Fatal(err)
		}
		if userId == user2 && statut == "accepte" {
			ensAmisId = append(ensAmisId, user1)
		}

	}
	ensAmis = convertIdAmis(ensAmisId)
	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}

	return ensAmis
}

func insertAmis(user1 string, user2 string) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()
	query := "SELECT id FROM users WHERE nom = ?"
	var user1Id int
	err = db.QueryRow(query, user1).Scan(&user1Id)
	if err != nil {
		return err
	}

	// Récupérer l'ID de l'utilisateur 2
	query = "SELECT id FROM users WHERE nom = ?"
	var user2Id int
	err = db.QueryRow(query, user2).Scan(&user2Id)
	if err != nil {
		return err
	}
	fmt.Print(user1Id, user2Id)
	// Préparer la requête SQL d'insertion
	possible := eviterDoublons(user1Id, user2Id)
	if possible != "true" {
		fmt.Print("c bon")
		stmt, err := db.Prepare("INSERT INTO Amis (demandeur,receveur,statut) VALUES (?, ?,?)")
		if err != nil {
			return err
		}
		defer stmt.Close()

		_, err = stmt.Exec(user1Id, user2Id, "attente")
		if err != nil {
			return err
		}
	} else {
		fmt.Print("deja ami")
	}
	return nil
}

func eviterDoublons(arg1 int, arg2 int) string {
	var result string
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return ("erreur")
	}
	defer db.Close()
	query := "SELECT demandeur,receveur FROM Amis"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var user1 int
		var user2 int

		err := rows.Scan(&user1, &user2)
		if err != nil {
			log.Fatal(err)
		}
		if arg1 == user1 && arg2 == user2 || arg1 == user2 && arg2 == user1 {
			result = "true"
		}

	}

	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
	return result
}

//-------------------RECHERCHE--------------------------------------

func rechercheUsers() []User {
	var rechUser User
	var rechUsers []User
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return (rechUsers)
	}
	defer db.Close()
	query := "SELECT id,nom,prenom FROM users"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var id string
		var prenom string

		var nom string

		err := rows.Scan(&id, &prenom, &nom)
		if err != nil {
			log.Fatal(err)
		}
		rechUser.Id = id
		rechUser.FirstName = prenom
		rechUser.LastName = nom
		rechUsers = append(rechUsers, rechUser)
	}

	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
	return rechUsers
}

//---------------CREATION TABLES---------------

func migrationTable(tableName string) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	// Check if table exists
	rows, err := db.Query("SELECT name FROM sqlite_sequence WHERE name=?", tableName)
	if err != nil {
		return err
	}
	defer rows.Close()

	if rows.Next() {
		log.Printf("Table %s already exists\n", tableName)
		return nil
	}

	// Chargement du fichier de migration
	migrationBytes, err := ioutil.ReadFile("./migrations/" + tableName + ".sql")
	if err != nil {
		return err
	}
	migrationQuery := string(migrationBytes)

	// Exécution de la migration
	_, err = db.Exec(migrationQuery)
	if err != nil {
		return err
	}
	log.Println("Migration " + tableName + " réussie")
	return nil
}

func tableGroupe() {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Chargement du fichier de migration
	migrationBytes, err := ioutil.ReadFile("./migrations/groupe.sql")
	if err != nil {
		log.Fatal(err)
	}
	migrationQuery := string(migrationBytes)

	// Exécution de la migration
	_, err = db.Exec(migrationQuery)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration Groupe réussie")
}

func tableGroupeUsers() {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Chargement du fichier de migration
	migrationBytes, err := ioutil.ReadFile("./migrations/groupeUsers.sql")
	if err != nil {
		log.Fatal(err)
	}
	migrationQuery := string(migrationBytes)

	// Exécution de la migration
	_, err = db.Exec(migrationQuery)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration GroupeUsers réussie")
}

func tableAmis() {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Chargement du fichier de migration
	migrationBytes, err := ioutil.ReadFile("./migrations/amis.sql")
	if err != nil {
		log.Fatal(err)
	}
	migrationQuery := string(migrationBytes)

	// Exécution de la migration
	_, err = db.Exec(migrationQuery)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration Amis réussie")
}

func tableUsers() {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Chargement du fichier de migration
	migrationBytes, err := ioutil.ReadFile("./migrations/users_up.sql")
	if err != nil {
		log.Fatal(err)
	}
	migrationQuery := string(migrationBytes)

	// Exécution de la migration
	_, err = db.Exec(migrationQuery)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration Users réussie")
}

func tableSessions() {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Chargement du fichier de migration
	migrationBytes, err := ioutil.ReadFile("./migrations/session.sql")
	if err != nil {
		log.Fatal(err)
	}
	migrationQuery := string(migrationBytes)

	// Exécution de la migration
	_, err = db.Exec(migrationQuery)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration Sessions réussie")
}

// -------------------PROFIL------------------------
func modifierProfil(user User, utilisateur string) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	stmt, err := db.Prepare("UPDATE users SET prenom=?, nom=?, email=?, anniv=?, avatar=?, surnom=?, propos=?, isPublic=? WHERE nom =?")
	if err != nil {
		// gérer l'erreur de préparation de la requête
	}
	res, err := stmt.Exec(user.FirstName, user.LastName, user.Email, user.Anniv, user.Avatar, user.Surnom, user.Propos, user.IsPublic, utilisateur)
	if err != nil {
		// gérer l'erreur d'exécution de la requête
	}
	rowCount, err := res.RowsAffected()
	if err != nil {
		// gérer l'erreur de récupération du nombre de lignes affectées
	}
	if rowCount == 0 {
		// gérer l'erreur de ligne non trouvée
	}
	return nil
}

func profil(nom string) User {
	var user User
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return user
	}
	defer db.Close()

	query := "SELECT prenom,nom,email,anniv,avatar,surnom,propos,ispublic,followers,followed,pending FROM users WHERE nom = ?"
	row := db.QueryRow(query, nom)

	var prenom string
	var email string
	var anniv string
	var avatar string
	var surnom string
	var propos string
	var ispublic bool
	var followers string
	var followed string
	var pending string

	err = row.Scan(&prenom, &nom, &email, &anniv, &avatar, &surnom, &propos, &ispublic, &followers, &followed, &pending)

	if err == sql.ErrNoRows {
		fmt.Println("No rows found for user", nom)
		return user
	}

	if err != nil {
		log.Fatal(err)
	}

	user.FirstName = prenom
	user.LastName = nom
	user.Email = email
	user.Anniv = anniv
	user.Avatar = avatar
	user.Surnom = surnom
	user.Propos = propos
	user.IsPublic = ispublic
	user.Followers = followers
	user.Followed = followed
	user.Pending = pending

	return user
}

func updateProfileVisibility(checked bool) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	stmt, err := db.Prepare("UPDATE users SET visibility = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(checked)
	if err != nil {
		return err
	}
	return nil
}

// -----------CONNEXION
func CheckSessionAndRemove(utilisateur string) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Préparer la requête SQL de suppression
	stmt, err := db.Prepare("DELETE FROM sessions WHERE nom=?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	// Exécuter la requête SQL de suppression
	_, err = stmt.Exec(utilisateur)
	if err != nil {
		log.Fatal(err)
	}
}

func insertSession(utilisateur string, session_id string) error {
	CheckSessionAndRemove(utilisateur)
	t := time.Now()

	date := t.Format("2006-01-02 15:04:05")

	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	// Préparer la requête SQL d'insertion
	stmt, err := db.Prepare("INSERT INTO sessions ( nom,session_id, date) VALUES (?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Exécuter la requête SQL d'insertion avec les valeurs de l'objet User
	_, err = stmt.Exec(utilisateur, session_id, date)
	if err != nil {
		return err
	}
	return nil
}

func connectUser(auth AuthUser) string {
	result := "nonConnecte"
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return ("erreur")
	}
	defer db.Close()
	query := "SELECT nom,email, password FROM users"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var email string
		var password string
		var nom string

		err := rows.Scan(&nom, &email, &password)
		if err != nil {
			log.Fatal(err)
		}
		if auth.Email == email && IsGoodPassword(password, auth.Password) {
			result = "connecte"
			utilisateur = nom
			connecte = true
		}
		// Faire quelque chose avec les valeurs récupérées
		//
	}

	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
	return result
}

//----------------PARAM-----------------

func param(noms string) User {
	var user User
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return user
	}
	defer db.Close()
	query := "SELECT prenom,nom,email,anniv,avatar,surnom,propos,ispublic,followers,followed FROM users"
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// Parcourir les résultats de la requête
	for rows.Next() {
		var prenom string
		var nom string

		var email string
		var anniv string
		var avatar string
		var surnom string
		var propos string
		var ispublic bool
		var followers string
		var followed string

		err := rows.Scan(&prenom, &nom, &email, &anniv, &avatar, &surnom, &propos, &ispublic, &followers, &followed)
		if err != nil {
			log.Fatal(err)
		}
		if noms == nom {
			user.FirstName = prenom
			user.LastName = nom
			user.Email = email
			user.Anniv = anniv
			user.Avatar = avatar
			user.Surnom = surnom
			user.Propos = propos
			user.IsPublic = ispublic
			user.Followers = followers
			user.Followed = followed

			// Faire quelque chose avec les valeurs récupérées
			//
		}

		if err = rows.Err(); err != nil {
			log.Fatal(err)
		}

	}
	return user
}

//-------------INSCRIPTION---------------------

func insertUser(user User) InsertResult {
	result := InsertResult{Err: nil, Result: "Utilisateur inséré avec succès", Accept: true}
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		result.Err = err
	}
	defer db.Close()

	// Vérifier si l'email existe déjà
	emailQuery := "SELECT email FROM users WHERE email = ?"
	var email string
	err = db.QueryRow(emailQuery, user.Email).Scan(&email)
	if err == nil {
		result.Accept = false
		result.Result = "L'email existe déjà dans la base de données"
		return result
	} else if err != sql.ErrNoRows {
		result.Err = err
		return result
	}

	// Vérifier si le nom de famille existe déjà
	lastNameQuery := "SELECT nom FROM users WHERE nom = ?"
	var nom string
	err = db.QueryRow(lastNameQuery, user.LastName).Scan(&nom)
	if err == nil {
		result.Accept = false
		result.Result = "Le nom de famille existe déjà dans la base de données"
		return result
	} else if err != sql.ErrNoRows {
		result.Err = err
		return result
	}

	// Insérer l'utilisateur si tout est bon
	stmt, err := db.Prepare("INSERT INTO users (prenom, nom, email, password, anniv, avatar, surnom, propos, ispublic, followers, followed, pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		result.Err = err
		return result
	}
	defer stmt.Close()

	pass, _ := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	user.Password = string(pass)

	_, err = stmt.Exec(user.FirstName, user.LastName, user.Email, user.Password, user.Anniv, user.Avatar, user.Surnom, user.Propos, user.IsPublic, user.Followers, user.Followed, user.Pending)
	if err != nil {
		result.Err = err
		return result
	}
	return result
}

func main() {
	// UpdatePasswordTOHashedSQL()
	http.HandleFunc("/ws", handleWebSocket)
	tableNames := [...]string{"amis", "groupe", "groupeUsers", "private_messages", "session", "users_up", "notifications", "commentaires", "posts", "groupMessages", "groupEvents"}
	for _, i := range tableNames {
		err := migrationTable(i)
		if err != nil {
			log.Println("Migration failed:", err)
		}
	}

	for {
		err := http.ListenAndServe(":8080", nil)
		if err != nil {
			fmt.Println("\033[33mWebsocket connection \033[31mclosed\033[33m and rerun \033[0m")
		}
	}

	// Wait for user input to exit
	fmt.Println("Press Enter to exit...")
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{}
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("websocket upgrade failed:", err)
		return
	}
	defer conn.Close()
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Println(err)
			return
		}

		messageObj := Message{}
		err = json.Unmarshal(message, &messageObj)
		// fmt.Print(messageObj)
		if err != nil {
			fmt.Println(err)
			return
		}

		switch messageObj.Type {

		case "rechercheGroupe":

			// ca exclut les groupes ou celui qui cherche est deja quil soit createur, invite ou qu'il est deja une demande en attente
			groupeData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			chercheure := groupeData["chercheur"].(string)
			chercheur := UUIDtoUsername(chercheure)
			rechGroupe := rechercheGroupe(chercheur)
			err = conn.WriteJSON(rechGroupe)
			if err != nil {
				log.Fatal(err)
			}
			// fmt.Print(rechGroupe)
			// fmt.Print(chercheur)
			// fmt.Print(dejaGroupe(chercheur))
		case "demandeGroupeExt":
			// a revoir

			groupeData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			receveur := groupeData["receveur"].(string)
			demandeure := groupeData["demandeur"].(string)
			demandeur := UUIDtoUsername(demandeure)
			nom := groupeData["nomGroupe"].(string)
			statut := groupeData["statut"].(string)

			demandeGroupeExt(nom, receveur, demandeur, statut)

		case "acceptDemandeExt":

			// ca exclut les groupes ou celui qui cherche est deja quil soit createur, invite ou qu'il est deja une demande en attente
			groupeData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			// createure := groupeData["createur"].(string)
			// createur := UUIDtoUsername(createure)
			persAccepte := groupeData["utilisateur"].(string)
			nomGroupe := groupeData["nomGroupe"].(string)
			acceptDemandeExt(persAccepte, nomGroupe)
			// fmt.Println(createur, persAccepte, nomGroupe)

		case "refuseDemandeExt":

			groupeData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			// createure := groupeData["createur"].(string)
			// createur := UUIDtoUsername(createure)
			persAccepte := groupeData["utilisateur"].(string)
			nomGroupe := groupeData["nomGroupe"].(string)

			refuseDemandeExt(persAccepte, nomGroupe)
			// fmt.Println(createur, persAccepte, nomGroupe)
		case "creerGroupe":
			var result InsertResult
			group, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			var groupe Groupe

			groupe.Nom = group["nomGroupe"].(string)
			groupe.Description = group["descrGroupe"].(string)

			groupe.Createur = UUIDtoUsername(group["createur"].(string))
			invites, ok := group["invites"].([]interface{})
			if ok {
				for _, invite := range invites {
					// Ajouter l'invite à la liste d'invités du groupe
					groupe.Invites = append(groupe.Invites, invite.(string))
				}
			}
			// creer fonction db

			result = (insertGroupe(groupe))
			if result.Accept == false {
				err := conn.WriteJSON(result)
				if err != nil {
					fmt.Println("Error sending JSON message:", err)
					return
				}

			} else {
				err := conn.WriteJSON(result)
				if err != nil {
					fmt.Println("Error sending JSON message:", err)
					return
				}
			}
		case "creerDemandeGroupe":
			// fmt.Print("ok")
			// var result InsertResult
			group, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			// fmt.Print(group)
			var groupe Groupe

			// fmt.Print(group["nomGroupe"])
			groupe.Nom = group["nomGroupe"].(string)

			invites, ok := group["invites"].([]interface{})
			// fmt.Print(invites)

			if ok {
				for _, invite := range invites {

					groupe.Invites = append(groupe.Invites, invite.(string))

				}
			}

			// fmt.Print(groupe.Nom)
			// creer fonction db
			// fmt.Print(groupe.Nom)
			(insertInvites(groupe))
			// fmt.Print(result)
			// if result.Accept == false {
			// 	err := conn.WriteJSON(result)
			// 	if err != nil {
			// 		fmt.Println("Error sending JSON message:", err)
			// 		return
			// 	}

			// } else {
			// 	err := conn.WriteJSON(result)
			// 	if err != nil {
			// 		fmt.Println("Error sending JSON message:", err)
			// 		return
			// 	}
			// }
		case "voirGroupe":
			voir, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}

			user := UUIDtoUsername(voir["utilisateur"].(string))

			groupes := demandeGroupe(user)
			jsonGroupes, err := json.Marshal(groupes)
			if err != nil {
				log.Fatal(err)
			}

			err = json.Unmarshal(jsonGroupes, &groupes)
			if err != nil {
				log.Fatal(err)
			}

			// Send the slice of Groupe over WebSockets
			err = conn.WriteJSON(Message{
				Type: "groupes",
				Data: groupes,
			})
			if err != nil {
				log.Println(err)
			}
		case "InviterGroupe":
			var rechUser []User
			rechUser = rechercheUsers()
			err = conn.WriteJSON(rechUser)
			if err != nil {
				log.Fatal(err)
			}
		case "acceptGroupe":

			voir, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}

			user := UUIDtoUsername(voir["utilisateur"].(string))

			accepterGroupe(user)
		case "refusGroupe":

			voir, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}

			user := UUIDtoUsername(voir["utilisateur"].(string))
			refuserGroupe(user)

		case "acceptAmis":
			messageData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			user := messageData["user"].(string)
			userAccepte := messageData["userAccepte"].(string)
			// reponse := messageData["reponse"].(string)
			// fmt.Print(user, userAccepte, reponse)
			reponse := (accepterAmis(user, userAccepte))
			if reponse == "true" {
				if err := conn.WriteMessage(websocket.TextMessage, []byte(reponse)); err != nil {
					log.Println("websocket write failed:", err)
					return

				}
			}
		case "refusAmis":
			messageData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			user := messageData["user"].(string)
			userRefuse := messageData["userRefuse"].(string)
			reponse := refuserAmis(user, userRefuse)
			if reponse == "true" {
				if err := conn.WriteMessage(websocket.TextMessage, []byte(reponse)); err != nil {
					log.Println("websocket write failed:", err)
					return

				}
			}
		case "demandeAmis":
			var tab []string
			user, ok := messageObj.Data.(string)
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			tab = demandeAmis(user)
			// fmt.Print(tab[0])
			message := Message{Data: tab}

			// Envoyer la structure via WebSocket
			err := conn.WriteJSON(message)
			if err != nil {
				log.Println(err)
			}
		case "follow":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			user1, ok := data["user1"].(string)
			if !ok {
				fmt.Println("Invalid value for user1")
				return
			}
			user2, ok := data["user2"].(string)
			if !ok {
				fmt.Println("Invalid value for user2")
				return
			}

			PushFollowers(user1, user2)
		case "unfollow":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			user1, ok := data["user1"].(string)
			if !ok {
				fmt.Println("Invalid value for user1")
				return
			}
			user2, ok := data["user2"].(string)
			if !ok {
				fmt.Println("Invalid value for user2")
				return
			}

			DeleteFollowers(user1, user2)
		case "isFollowing":
			data, ok := messageObj.Data.(map[string]interface{})

			errorVar := false
			if !ok {
				fmt.Println("Invalid data for message")
				errorVar = true
			}
			user1, ok := data["user1"].(string)
			if !ok {
				fmt.Println("Invalid value for user1")
				errorVar = true
			}
			user2, ok := data["user2"].(string)
			if !ok {
				fmt.Println("Invalid value for user2")
				errorVar = true
			}
			result := IsFollowing(user1, user2)
			message := Message{
				Type: "isFollowing",
				Data: result,
			}
			if errorVar {
				message.Data = false
			}
			// Envoyer la structure via WebSocket
			err := conn.WriteJSON(message)
			if err != nil {
				log.Println(err)
			}
		case "isPending":
			data, ok := messageObj.Data.(map[string]interface{})

			errorVar := false
			if !ok {
				fmt.Println("Invalid data for message")
				errorVar = true
			}
			user1, ok := data["user1"].(string)
			if !ok {
				fmt.Println("Invalid value for user1")
				errorVar = true
			}
			user2, ok := data["user2"].(string)
			if !ok {
				fmt.Println("Invalid value for user2")
				errorVar = true
			}
			result := IsPending(user1, user2)
			message := Message{
				Type: "isPending",
				Data: result,
			}
			if errorVar {
				message.Data = false
			}
			// Envoyer la structure via WebSocket
			err := conn.WriteJSON(message)
			if err != nil {
				log.Println(err)
			}
		case "voirAmis":
			user, ok := messageObj.Data.(string)
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			listeAmis := (voirAmis(user))

			// fmt.Print(tab[0])
			amis := Amis{
				ListeAmis: listeAmis,
				NbreAmis:  len(listeAmis),
			}

			// Initialiser la structure Message avec la structure Amis
			message := Message{
				Type: "voirAmis",
				Data: amis,
			}

			// Envoyer la structure via WebSocket
			err := conn.WriteJSON(message)
			if err != nil {
				log.Println(err)
			}

		case "requeteAmis":
			userData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			user1 := userData["user1"].(string)
			user2 := userData["user2"].(string)
			insertAmis(user1, user2)

		case "recherche":
			var rechUser []User
			rechUser = rechercheUsers()
			err = conn.WriteJSON(rechUser)
			if err != nil {
				log.Fatal(err)
			}

		case "profil":
			var username string
			switch v := messageObj.Data.(type) {
			case string:
				username = UUIDtoUsername(v)
			default:
				fmt.Println("Data field is not a string")
				return
			}
			var userProfil User
			userProfil = profil(username)

			err := conn.WriteJSON(userProfil)
			if err != nil {
				fmt.Println("Error sending JSON message:", err)
				return
			}

		case "profilExt":
			nom := messageObj.Data.(string)
			var userProfil User
			userProfil = profil(nom)

			err := conn.WriteJSON(userProfil)
			if err != nil {
				fmt.Println("Error sending JSON message:", err)
				return
			}
		case "modifierProfil":
			userData, ok := messageObj.Data.(map[string]interface{})

			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			var user User
			user.FirstName = userData["firstName"].(string)
			user.LastName = userData["lastName"].(string)
			user.Email = userData["email"].(string)
			user.Anniv = userData["anniv"].(string)
			user.Avatar = userData["avatar"].(string)
			user.Surnom = userData["surnom"].(string)
			user.Propos = userData["propos"].(string)
			user.IsPublic = userData["ispublic"].(bool)
			utilisateur = userData["utilisateur"].(string)

			// il faudra update la database user
			modifierProfil(user, UUIDtoUsername(utilisateur))

		case "param":
			nom := UUIDtoUsername(messageObj.Data.(string))

			var userProfil User
			userProfil = param(nom)
			err := conn.WriteJSON(userProfil)
			if err != nil {
				fmt.Println("Error sending JSON message:", err)
				return
			}
		case "profileVisibility":
			profileVisibility, ok := messageObj.Data.(bool)
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			err := updateProfileVisibility(profileVisibility)
			if err != nil {
				fmt.Println("Error sending JSON message:", err)
				return
			}
		case "register":
			userData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			var user User
			user.FirstName = userData["firstName"].(string)
			user.LastName = userData["lastName"].(string)
			user.Email = userData["email"].(string)
			user.Password = userData["password"].(string)
			user.Anniv = userData["anniv"].(string)
			user.Avatar = userData["avatar"].(string)
			user.Surnom = userData["surnom"].(string)
			user.Propos = userData["propos"].(string)
			user.IsPublic = userData["ispublic"].(bool)
			user.Followers = userData["followers"].(string)
			user.Followed = userData["followed"].(string)
			user.Pending = userData["pending"].(string)
			result := insertUser(user)
			if result.Err != nil {
				fmt.Println(result.Err)
				return
			}

			// si l'utilisateur existe deja
			// fmt.Println("Received message:", user)
			if result.Accept != false {
				conn.WriteJSON(Message{Type: "register", Data: "success"})
			} else {
				conn.WriteJSON(Message{Type: "register", Data: "failure"})
			}
		case "login":
			logData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			var auth AuthUser
			auth.Email = logData["email"].(string)
			auth.Password = logData["password"].(string)
			fmt.Print(auth.Email)
			// result := connectUser(auth)
			// if result == "connecte" {
			// 	session_id := uuid.NewV4().String()
			// 	type Session struct {
			// 		Session_id  string `json:"session_id"`
			// 		Utilisateur string `json:"utilisateur"`
			// 	}
			// 	session := Session{Session_id: session_id, Utilisateur: utilisateur}
			// 	if err := conn.WriteJSON(session); err != nil {
			// 		log.Println("websocket write failed:", err)
			// 		return
			// 	}

			// 	if err := insertSession(utilisateur, session_id); err != nil {
			// 		log.Println("insert session failed:", err)
			// 		return
			// 	}
			// }
			// if result == "nonConnecte" {
			// 	if err := conn.WriteMessage(websocket.TextMessage, []byte("invite")); err != nil {
			// 		log.Println("websocket write failed:", err)
			// 		return

			//  	}
			// 	// insertSession("invite")
			// }

		case "post":

			postData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}

			var post Post
			post.Username = UUIDtoUsername(postData["username"].(string))
			post.Message = postData["message"].(string)
			post.Image = postData["image"].(string)
			post.Visibility = postData["visibility"].(string)

			err = insertPost(post)
			if err != nil {
				fmt.Println(err)
				return
			}

			var posts []Post
			posts = fetchPosts()

			err = conn.WriteJSON(posts)
			if err != nil {
				log.Fatal(err)
			}
		case "post:fetch":
			var posts []Post
			posts = fetchPosts()

			err = conn.WriteJSON(posts)
			if err != nil {
				log.Fatal(err)
			}
		case "messages":

			messageData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}

			var message PrivateMessage
			message.Sender = UUIDtoUsername(messageData["sender"].(string))
			message.SenderId = strconv.Itoa(UUIDtoID(messageData["sender"].(string)))
			message.ReceiverId = messageData["receiverId"].(string)
			message.Receiver = GetUsernameByID(messageData["receiver"].(string))
			message.Content = messageData["content"].(string)
			message.Date = time.Now().Format("2006-01-02 15:04:05")

			err = insertMessage(message)
			if err != nil {
				fmt.Println(err)
				return
			}
			AddNotifs("message", message.Sender, message.Receiver, 0)

			var messages []PrivateMessage
			messages = fetchMessages(message.Sender)

			err = conn.WriteJSON(messages)
			if err != nil {
				log.Fatal(err)
			}
		case "groupMessages":

			messageData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}

			var groupMessage GroupMessage
			groupMessage.Sender = UUIDtoUsername(messageData["senderId"].(string))
			groupMessage.SenderId = strconv.Itoa(UUIDtoID(messageData["senderId"].(string)))
			groupMessage.GroupId = messageData["groupeId"].(string)
			groupMessage.Content = messageData["contenu"].(string)
			groupMessage.Date = time.Now().Format("2006-01-02 15:04:05")

			err = insertGroupMessage(groupMessage)
			if err != nil {
				fmt.Println(err)
				return
			}
			// AddNotifs("message", message.Sender, message.Receiver, 0)

			var groupMessages []GroupMessage
			groupMessages = fetchGroupMessages(groupMessage.GroupId)

			err = conn.WriteJSON(groupMessages)
			if err != nil {
				log.Fatal(err)
			}
		case "group:delete":
			groupData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			groupID := groupData["groupID"].(string)
			username := UUIDtoUsername(groupData["username"].(string))
			ok = deleteGroup(groupID, username)
			if ok {
				conn.WriteJSON(Message{Type: "group:delete", Data: "success"})
			} else {
				conn.WriteJSON(Message{Type: "group:delete", Data: "error"})
			}
		case "fetchUser":
			uuid := messageObj.Data.(string)
			username := UUIDtoUsername(uuid)
			fmt.Println(username, uuid)
			conn.WriteJSON(Message{Type: "fetchUser", Data: username})
		case "messages:fetch":
			username := UUIDtoUsername(messageObj.Data.(string))
			messages, userID := fetchMessagesWithID(username)
			response := struct {
				Messages []PrivateMessage `json:"messages"`
				UserID   int              `json:"userId"`
			}{
				Messages: messages,
				UserID:   userID,
			}
			err = conn.WriteJSON(response)
			if err != nil {
				log.Fatal(err)
			}
		case "groupMessages:fetch":
			// fmt.Println("Received message:", messageObj.Data)
			messageData, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			// fmt.Println(messageData)
			groupMessages := fetchGroupMessages(messageData["groupeId"].(string))
			userID := UUIDtoID(messageData["userUUID"].(string))
			response := struct {
				Messages []GroupMessage `json:"groupMessages"`
				UserID   int            `json:"userId"`
			}{
				Messages: groupMessages,
				UserID:   userID,
			}
			err = conn.WriteJSON(response)
			if err != nil {
				log.Fatal(err)
			}
		case "users:fetch":
			var users []User
			users, err = fetchUsers()
			if err != nil {
				log.Fatal(err)
			}

			err = conn.WriteJSON(&users)
			if err != nil {
				log.Fatal(err)
			}
		case "invitGrpeExist":

			//il faut pas pouvoir invites des personnes qui sont deja invites

			var users []User
			var friends []User

			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				// handle error if messageObj.Data is not of type map[string]interface{}
			}

			// access the senderId field of data
			senderId, ok := data["senderId"].(string)
			grou := data["nomGroupe"].(string)
			fmt.Print(grou, "ici")

			sender := UUIDtoUsername(senderId)
			users, err = fetchUsers()
			if err != nil {
				log.Fatal(err)
			}
			for _, user := range users {

				if IsFollowing(user.LastName, sender) && IsFollowing(sender, user.LastName) && user.LastName != sender && notInGroup(user.LastName, grou) == false {
					friends = append(friends, user)

				}
			}
			// fmt.Print(friends)
			// fmt.Print(users, "invitgrpeuser")
			err = conn.WriteJSON(friends)
			if err != nil {
				log.Fatal(err)
			}
		case "friends:fetch":
			var users []User
			var friends []User
			// assert that messageObj.Data is of type map[string]interface{}
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				// handle error if messageObj.Data is not of type map[string]interface{}
			}

			// access the senderId field of data
			senderId, ok := data["senderId"].(string)
			if !ok {
				// handle error if senderId is not of type string
			}

			sender := UUIDtoUsername(senderId)
			users, err = fetchUsers()
			if err != nil {
				log.Fatal(err)
			}
			for _, user := range users {
				if IsFollowing(user.LastName, sender) && IsFollowing(sender, user.LastName) && user.LastName != sender {
					friends = append(friends, user)
				}
			}
			err = conn.WriteJSON(friends)
			if err != nil {
				log.Fatal(err)
			}
		case "notif:fetch":
			username := UUIDtoUsername(messageObj.Data.(string))
			var notifs []Notification
			db, err := sql.Open("sqlite3", "./social.db")
			defer db.Close()
			checkEventStatus(db, username)
			notifs, err = fetchNotifs(username)
			if err != nil {
				log.Fatal(err)
			}

			err = conn.WriteJSON(notifs)
			if err != nil {
				log.Fatal(err)
			}
		case "follow:request":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			user1, ok := data["user1"].(string)
			if !ok {
				fmt.Println("Invalid value for user1")
				return
			}
			user2, ok := data["user2"].(string)
			if !ok {
				fmt.Println("Invalid value for user2")
				return
			}

			PushFollowRequests(user1, user2)
			CreateNotifFollow(user1, user2)
		case "notif:delete":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			id, ok := data["id"].(float64)
			if !ok {
				fmt.Println("Invalid value for id")
				return
			}
			DeleteNotif(int(id))
		case "comment":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			var comment Comment

			comment.Sender = UUIDtoUsername(data["username"].(string))
			comment.Postid = int(data["postId"].(float64))
			comment.Message = data["message"].(string)
			comment.Date = time.Now().Format("2006-01-02 15:04:05")

			err = insertComment(comment)
			if err != nil {
				fmt.Println(err)
				return
			}
			AddNotifs("comment", comment.Sender, GetPostCreator(comment.Postid), comment.Postid)
			posts := fetchPosts()
			err = conn.WriteJSON(posts)
			if err != nil {
				log.Fatal(err)
			}
		case "createEvent":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			creator, ok := data["creator"].(string)
			if !ok {
				fmt.Println("Invalid value for creator")
				return
			}
			title, ok := data["title"].(string)
			if !ok {
				fmt.Println("Invalid value for title")
				return
			}
			description, ok := data["description"].(string)
			if !ok {
				fmt.Println("Invalid value for description")
				return
			}

			startDate, ok := data["startDate"].(string)
			if !ok {
				fmt.Println("Invalid value for startDate")
				return
			}
			endDate, ok := data["endDate"].(string)
			if !ok {
				fmt.Println("Invalid value for endDate")
				return
			}

			optionsNotif, ok := data["optionsNotif"].([]interface{})
			if !ok {
				fmt.Println("Invalid value for optionsNotif")
				return
			}

			intSlice := make([]int, 0, len(optionsNotif))
			for _, v := range optionsNotif {
				floatVal, ok := v.(float64)
				if !ok {
					fmt.Printf("Skipping non-float element: %v\n", v)
					continue
				}
				intVal := int(floatVal)
				intSlice = append(intSlice, intVal)
			}

			groupID, ok := data["groupID"].(string)
			if !ok {
				fmt.Println("Invalid value for groupID")
				return
			}
			options, ok := data["options"].([]interface{})
			if !ok {
				fmt.Println("Invalid value for options")
				return
			}

			// Filter out any empty options
			filteredOptions := make([]string, 0)
			for _, option := range options {
				if str, ok := option.(string); ok && str != "" {
					filteredOptions = append(filteredOptions, str)
				}
			}

			if title == "" || description == "" || len(filteredOptions) < 2 {
				fmt.Println("Invalid event data")
				return
			}

			// Create new event and insert it into the database
			t := time.Now()
			date := t.Format("2006-01-02 15:04:05")
			event := GroupEvent{Creator: UUIDtoUsername(creator), Title: title, Description: description, StartDate: startDate, EndDate: endDate, OptionsNotif: intSlice, GroupID: groupID, Date: date}

			// Add options to event if any exist
			for i, option := range filteredOptions {
				switch i {
				case 0:
					event.Option1 = option
				case 1:
					event.Option2 = option
				case 2:
					event.Option3 = option
				case 3:
					event.Option4 = option
				}
			}

			err = insertGroupEvent(event)
			if err != nil {
				fmt.Println(err)
				return
			}

			// Fetch all events from the database
			events, err := fetchGroupEvents(groupID)
			if err != nil {
				fmt.Println(err)
				return
			}

			// Send the events to all connected clients
			err = conn.WriteJSON(events)
			if err != nil {
				log.Fatal(err)
			}
		case "events:fetch":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}
			groupID, ok := data["groupID"].(string)
			if !ok {
				fmt.Println("Invalid value for groupID")
				return
			}
			events, err := fetchGroupEvents(groupID)
			if err != nil {
				fmt.Println(err)
				return
			}

			// Create a slice of event objects to send to the client
			eventObjects := make([]map[string]interface{}, len(events))
			for i, event := range events {
				eventObjects[i] = map[string]interface{}{
					"id":           event.ID,
					"creator":      event.Creator,
					"title":        event.Title,
					"description":  event.Description,
					"date":         event.Date,
					"startDate":    event.StartDate,
					"endDate":      event.EndDate,
					"option1":      event.Option1,
					"option2":      event.Option2,
					"option3":      event.Option3,
					"option4":      event.Option4,
					"optionsNotif": event.OptionsNotif,
					"userAnswers":  event.UserAnswers,
				}
			}

			response := map[string]interface{}{
				"type": "events:fetch",
				"data": eventObjects,
			}

			err = conn.WriteJSON(response)
			if err != nil {
				log.Fatal(err)
			}
		case "selectOption":
			data, ok := messageObj.Data.(map[string]interface{})
			if !ok {
				fmt.Println("Invalid data for message")
				return
			}

			events, ok := data["events"].([]interface{})
			if !ok {
				fmt.Println("Invalid data for events")
				return
			}

			userID, ok := data["user"].(string)
			userID = UUIDtoUsername(userID)
			if !ok {
				fmt.Println("Invalid data for user")
				return
			}

			for _, evt := range events {
				event, ok := evt.(map[string]interface{})
				if !ok {
					fmt.Println("Invalid event data")
					continue
				}

				eventID, ok := event["id"].(float64)
				if !ok {
					fmt.Println("Invalid event ID")
					continue
				}

				option, ok := event["userAnswers"]
				if !ok {
					fmt.Println("Invalid option", option)
					continue
				}

				err := updateGroupEvent(int(eventID), userID, option)
				if err != nil {
					// log.Fatal(err)
				}

			}
		}
	}
}

func deleteGroup(groupID, username string) bool {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	res, err := db.Exec("DELETE FROM groupe WHERE id = ? AND createur = ?", groupID, username)
	if err != nil {
		log.Fatal(err)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		log.Fatal(err)
	}
	if rowsAffected == 0 {
		return false
	}
	return true
}

func GetPostCreator(postid int) string {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	var username string
	err = db.QueryRow("SELECT username FROM posts WHERE id = ?", postid).Scan(&username)
	if err != nil {
		log.Fatal(err)
	}
	return username
}

func insertComment(comment Comment) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec("INSERT INTO commentaires (sender, postid, message, date) VALUES (?, ?, ?, ?)", UsernameToID(comment.Sender), comment.Postid, comment.Message, comment.Date)
	if err != nil {
		log.Fatal(err)
	}
	return nil
}

func DeleteNotif(id int) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	_, err = db.Exec("DELETE FROM notifications WHERE id = ?", id)
	if err != nil {
		log.Fatal(err)
	}
}

func CreateNotifFollow(user1 string, user2 string) {
	AddNotifs("follow", user1, user2, 0)
}

type Notification struct {
	ID       int    `json:"id"`
	Type     string `json:"type"`
	Sender   string `json:"sender"`
	Receiver string `json:"receiver"`
	GroupID  int    `json:"groupid"`
	Date     string `json:"date"`
}

func AddNotifs(Type string, Sender string, Receiver string, GroupID int) error {
	Date := time.Now().Format("2006-01-02 15:04:05")
	notif := Notification{Type: Type, Sender: Sender, Receiver: Receiver, GroupID: GroupID, Date: Date}
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	_, err = db.Exec("INSERT INTO notifications (type, sender, receiver, groupid, date) VALUES (?, ?, ?, ?, ?)", notif.Type, notif.Sender, notif.Receiver, notif.GroupID, notif.Date)
	if err != nil {
		log.Fatal(err)
	}
	return nil
}

func fetchNotifs(username string) ([]Notification, error) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	rows, err := db.Query("SELECT * FROM notifications WHERE receiver = ?", username)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()
	var notifs []Notification
	for rows.Next() {
		var notif Notification
		err = rows.Scan(&notif.ID, &notif.Type, &notif.Sender, &notif.Receiver, &notif.GroupID, &notif.Date)
		if err != nil {
			log.Fatal(err)
		}
		notifs = append(notifs, notif)
	}
	return notifs, nil
}

func IsGoodPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

func UpdatePasswordTOHashedSQL() {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	rows, err := db.Query("SELECT id, password FROM users")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()
	ids := []int{}
	passwords := []string{}
	for rows.Next() {
		var id int
		var password string
		err = rows.Scan(&id, &password)
		if err != nil {
			log.Fatal(err)
		}

		ids = append(ids, id)
		passwords = append(passwords, password)
	}
	err = rows.Err()
	if err != nil {
		log.Fatal(err)
	}
	for i := 0; i < len(ids); i++ {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(passwords[i]), 8)
		if err != nil {
			log.Fatal(err)
		}
		_, err = db.Exec("UPDATE users SET password = ? WHERE id = ?", hashedPassword, ids[i])
		if err != nil {
			log.Fatal(err)
		}
	}
}

func GetUsernameByID(id string) string {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	var username string
	err = db.QueryRow("SELECT nom FROM users WHERE id = ?", id).Scan(&username)
	if err != nil {
		log.Fatal(err)
	}
	return username
}

func UUIDtoUsername(UUID string) string {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	var username string
	err = db.QueryRow("SELECT nom FROM sessions WHERE session_id = ?", UUID).Scan(&username)
	if err != nil {
		return ""
	}
	return username
}

func UUIDtoID(UUID string) int {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	var id int
	err = db.QueryRow("SELECT id FROM users WHERE nom = (SELECT nom FROM sessions WHERE session_id = ?)", UUID).Scan(&id)
	if err != nil {
		log.Fatal(err)
	}
	return id
}

func UsernameToID(username string) int {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return 0
	}
	defer db.Close()
	var id int
	err = db.QueryRow("SELECT id FROM users WHERE nom = ?", username).Scan(&id)
	if err != nil {
		fmt.Println(err)
		return 0
	}
	return id
}

func fetchPosts() []Post {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM posts")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var post Post
		err := rows.Scan(&post.Id, &post.Username, &post.Message, &post.Image, &post.Visibility)
		if err != nil {
			log.Fatal(err)
		}

		post.Comments = fetchComments(post.Id)
		posts = append(posts, post)
	}
	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}
	return posts
}

type Comment struct {
	Id      int    `json:"id"`
	Postid  int    `json:"postid"`
	Message string `json:"message"`
	Sender  string `json:"sender"`
	Date    string `json:"date"`
}

func fetchComments(postid int) []Comment {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM commentaires WHERE postid = ?", postid)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var comment Comment
		var sender_id int
		err := rows.Scan(&comment.Id, &comment.Postid, &comment.Message, &sender_id, &comment.Date)
		if err != nil {
			log.Fatal(err)
		}
		comment.Sender = GetUsernameByID(strconv.Itoa(sender_id))

		comments = append(comments, comment)
	}
	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}
	return comments
}

type PrivateMessageWithSenderId struct {
	PrivateMessage
	SenderId string `json:"sender_id"`
}

func fetchMessagesWithID(username string) ([]PrivateMessage, int) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var userID int
	err = db.QueryRow("SELECT id FROM users WHERE nom = ?", username).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			// handle "user not found" error here
		} else {
			log.Fatal(err)
		}
	}

	rows, err := db.Query("SELECT * FROM private_messages WHERE receiver = ? OR sender = ?", username, username)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var messages []PrivateMessage
	for rows.Next() {
		var message PrivateMessage
		err := rows.Scan(&message.Id, &message.Sender, &message.SenderId, &message.Receiver, &message.ReceiverId, &message.Content, &message.Date)
		if err != nil {
			log.Fatal(err)
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}

	return messages, userID
}

func fetchMessages(Username string) []PrivateMessage {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM private_messages WHERE receiver = ? OR sender = ?", Username, Username)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var messages []PrivateMessage
	for rows.Next() {
		var message PrivateMessage
		err := rows.Scan(&message.Id, &message.Sender, &message.SenderId, &message.Receiver, &message.ReceiverId, &message.Content, &message.Date)
		if err != nil {
			log.Fatal(err)
		}

		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}
	return messages
}

func fetchGroupMessages(groupId string) []GroupMessage {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT * FROM groupMessages WHERE groupID = ?", groupId)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var groupMessages []GroupMessage
	for rows.Next() {
		var groupMessage GroupMessage
		err := rows.Scan(&groupMessage.Id, &groupMessage.Sender, &groupMessage.SenderId, &groupMessage.GroupId, &groupMessage.Content, &groupMessage.Date)
		if err != nil {
			log.Fatal(err)
		}
		//
		groupMessages = append(groupMessages, groupMessage)
	}
	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}
	return groupMessages
}

func insertPost(post Post) error {
	/* t := time.Now()

	date := t.Format("2006-01-02 15:04:05")
	*/
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	// Préparer la requête SQL d'insertion
	stmt, err := db.Prepare("INSERT INTO posts ( message, image, visibility,username) VALUES (?, ?,?,?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Exécuter la requête SQL d'insertion avec les valeurs de l'objet User
	_, err = stmt.Exec(post.Message, post.Image, post.Visibility, post.Username)
	if err != nil {
		return err
	}
	return nil
}

func insertMessage(message PrivateMessage) error {
	t := time.Now()

	date := t.Format("2006-01-02 15:04:05")
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	// Préparer la requête SQL d'insertion
	stmt, err := db.Prepare("INSERT INTO private_messages (sender, senderId, receiver, receiverId ,content, date) VALUES (?, ?, ?, ?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Exécuter la requête SQL d'insertion avec les valeurs de l'objet User
	_, err = stmt.Exec(message.Sender, message.SenderId, message.Receiver, message.ReceiverId, message.Content, date)
	if err != nil {
		return err
	}
	return nil
}

func insertGroupMessage(groupMessage GroupMessage) error {
	/*
		t := time.Now()

		date := t.Format("2006-01-02 15:04:05")
	*/
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	// Préparer la requête SQL d'insertion
	stmt, err := db.Prepare("INSERT INTO groupMessages (sender, senderId, groupId, content, date) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Exécuter la requête SQL d'insertion avec les valeurs de l'objet User
	_, err = stmt.Exec(groupMessage.Sender, groupMessage.SenderId, groupMessage.GroupId, groupMessage.Content, groupMessage.Date)
	if err != nil {
		return err
	}
	return nil
}

func fetchUsers() ([]User, error) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, prenom, nom, email, anniv, avatar, surnom, propos, followers, followed FROM users")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		err := rows.Scan(&user.Id, &user.FirstName, &user.LastName, &user.Email, &user.Anniv, &user.Avatar, &user.Surnom, &user.Propos, &user.Followers, &user.Followed)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func PushFollowers(user1, user2 string) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()
	if IsFollowing(user1, user2) {
		return nil // Already following
	}

	if !GetIsPublic(user2) {
		_, err = db.Exec("INSERT INTO notifications (type, sender, receiver,date) VALUES (?, ?, ?,?)", "follow", user1, user2, time.Now().Format("2006-01-02 15:04:05"))
		if err != nil {
			fmt.Println(err)
		}

	}
	// Update user1's followed field with user2's name
	_, err2 := db.Exec("UPDATE users SET followed = followed || ? || ',' WHERE nom = ?", user2, user1)
	if err2 != nil {
		fmt.Println(err2)
	}
	// Update user2's followers field with user1's name
	_, err = db.Exec("UPDATE users SET followers = followers || ? || ',' WHERE nom = ?", user1, user2)
	if err != nil {
		return err
	}
	return nil
}

func GetIsPublic(user string) bool {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	var isPublic string
	err = db.QueryRow("SELECT ispublic FROM users WHERE nom = ?", user).Scan(&isPublic)
	if err != nil {
		log.Fatal(err)
	}
	return isPublic == "1"
}

func DeleteFollowers(user1, user2 string) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()
	if !IsFollowing(user1, user2) {
		return nil // Not following
	}
	// Remove user1's name from user2's followers field
	_, err2 := db.Exec("UPDATE users SET followers = REPLACE(followers, ? || ',', '') WHERE nom = ?", user1, user2)
	fmt.Println(err2)
	if err2 != nil {
	}
	// Remove user2's name from user1's followed field
	_, err = db.Exec("UPDATE users SET followed = REPLACE(followed, ? || ',', '') WHERE nom = ?", user2, user1)
	if err != nil {
		return err
	}
	return nil
}

func PushFollowRequests(user1, user2 string) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()
	if IsFollowing(user1, user2) {
		return nil // Already following
	}
	// Update user2's followers field with user1's name
	_, err = db.Exec("UPDATE users SET pending = pending || ? || ',' WHERE nom = ?", user1, user2)
	if err != nil {
		return err
	}
	return nil
}

func IsFollowing(user1, user2 string) bool {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return false
	}
	defer db.Close()
	var followers string
	err2 := db.QueryRow("SELECT followers FROM users WHERE nom = ?", user2).Scan(&followers)
	if err2 != nil {
		return false
	}
	followersList := strings.Split(followers, ",")
	for _, follower := range followersList {
		if follower == user1 {
			return true
		}
	}
	return false
}

func IsPending(user1, user2 string) bool {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return false
	}
	defer db.Close()
	var followers string
	err2 := db.QueryRow("SELECT pending FROM users WHERE nom = ?", user2).Scan(&followers)
	if err2 != nil {
		return false
	}
	followersList := strings.Split(followers, ",")
	for _, follower := range followersList {
		if follower == user1 {
			return true
		}
	}
	return false
}

// insertGroupEvent inserts a new group event into the database.
func insertGroupEvent(event GroupEvent) error {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()
	stmt, err := db.Prepare("INSERT INTO GroupEvents(creator, title, description, date, startDate, endDate, optionsNotif, groupID, option1, option2, option3, option4, userAnswers) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	userAnswersJSON, err := json.Marshal(event.UserAnswers)
	if err != nil {
		return err
	}

	optionsNotifJSON, err := json.Marshal(event.OptionsNotif)
	if err != nil {
		return err
	}

	res, err := stmt.Exec(event.Creator, event.Title, event.Description, event.Date, event.StartDate, event.EndDate, string(optionsNotifJSON), event.GroupID, event.Option1, event.Option2, event.Option3, event.Option4, string(userAnswersJSON))
	if err != nil {
		return err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return err
	}

	event.ID = int(id)
	return nil
}

// fetchGroupEvents fetches all group events from the database.
func fetchGroupEvents(GroupID string) ([]GroupEvent, error) {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, creator, title, description, date, startDate, endDate, option1, option2, option3, option4, optionsNotif, userAnswers FROM GroupEvents WHERE GroupID = ?", GroupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []GroupEvent
	for rows.Next() {
		var event GroupEvent
		var optionsNotifStr string
		var userAnswersJSON string

		err := rows.Scan(&event.ID, &event.Creator, &event.Title, &event.Description, &event.Date, &event.StartDate, &event.EndDate, &event.Option1, &event.Option2, &event.Option3, &event.Option4, &optionsNotifStr, &userAnswersJSON)
		if err != nil {
			return nil, err
		}

		// Convert the optionsNotif string to a slice of integers
		var optionsNotifSlice []int
		err = json.Unmarshal([]byte(optionsNotifStr), &optionsNotifSlice)
		if err != nil {
			return nil, err
		}
		event.OptionsNotif = optionsNotifSlice

		err = json.Unmarshal([]byte(userAnswersJSON), &event.UserAnswers)
		if err != nil {
			return nil, err
		}

		events = append(events, event)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return events, nil
}

func updateGroupEvents(data interface{}) error {
	var events []map[string]interface{}

	// Check if the data is already a slice of maps
	events, ok := data.([]map[string]interface{})

	if !ok {
		return fmt.Errorf("data is not a slice of maps")
	}

	// Loop through the slice of maps and update the corresponding events
	for _, event := range events {
		eventID := int(event["id"].(float64))
		userAnswers := event["userAnswers"].(map[string]interface{})
		for userID, answer := range userAnswers {
			err := updateGroupEvent(eventID, userID, answer.(string))
			if err != nil {
				return err
			}
			fmt.Printf("Updated event %d for user %s with answer %s\n", eventID, userID, answer)
		}
	}

	return nil
}

func updateGroupEvent(eventID int, userID string, option interface{}) error {
	if userID == "" || option == nil {
		fmt.Println("userID and option cannot be empty", userID, option)
		return errors.New("userID and option cannot be empty")
	}

	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		return err
	}
	defer db.Close()

	stmt, err := db.Prepare("UPDATE GroupEvents SET userAnswers = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	var optionJSON []byte

	switch option.(type) {
	case string:
		// Check if option is already in JSON format or not
		if !json.Valid([]byte(option.(string))) {
			// Convert option to JSON format
			optionJSON, err = json.Marshal(option.(string))
			if err != nil {
				return err
			}
		} else {
			optionJSON = []byte(option.(string))
		}
	case []byte:
		optionJSON = option.([]byte)
	case map[string]interface{}:
		// Convert option map to JSON format
		optionJSON, err = json.Marshal(option)
		if err != nil {
			return err
		}
	default:
		return errors.New("unsupported option format")
	}

	// Remove userID and ":" from the option JSON string
	optionMap := make(map[string]string)
	err = json.Unmarshal(optionJSON, &optionMap)
	if err != nil {
		return err
	}
	optionStr := optionMap[userID]
	optionStr = strings.ReplaceAll(optionStr, ":", "")
	delete(optionMap, userID)
	optionMap[userID] = optionStr
	optionJSON, err = json.Marshal(optionMap)
	if err != nil {
		return err
	}

	// Execute the SQL statement with the JSON values
	_, err = stmt.Exec(string(optionJSON), eventID)
	if err != nil {
		return err
	}

	return nil
}

func checkEventStatus(db *sql.DB, username string) error {
	// Retrieve the event from the database
	var id int
	var creator string
	var title string
	var description string
	var date string
	var startDate string
	var endDate string
	var groupID string
	var option1 string
	var option2 string
	var option3 string
	var option4 string
	var optionsNotifStr string
	var userAnswersStr string

	row := db.QueryRow("SELECT * FROM groupEvents WHERE JSON_EXTRACT(userAnswers, ?) IS NOT NULL", "$."+username)

	err := row.Scan(&id, &creator, &title, &description, &date, &startDate, &endDate, &groupID, &option1, &option2, &option3, &option4, &optionsNotifStr, &userAnswersStr)
	if err != nil {
		fmt.Println("Error retrieving row:", err)
	} else {
		optionsNotif := make([]int, 0)
		err = json.Unmarshal([]byte(optionsNotifStr), &optionsNotif)
		if err != nil {
			fmt.Println("Error parsing optionsNotif:", err)
		}
		userAnswers := make(map[string]string)
		err = json.Unmarshal([]byte(userAnswersStr), &userAnswers)
		if err != nil {
			fmt.Println("Error parsing userAnswers:", err)
		}
		/*
			fmt.Println("ID:", id)
			fmt.Println("Creator:", creator)
			fmt.Println("Title:", title)
			fmt.Println("Description:", description)
			fmt.Println("Date:", date)
			fmt.Println("Start Date:", startDate)
			fmt.Println("End Date:", endDate)
			fmt.Println("Group ID:", groupID)
			fmt.Println("Option 1:", option1)
			fmt.Println("Option 2:", option2)
			fmt.Println("Option 3:", option3)
			fmt.Println("Option 4:", option4)
			fmt.Println("Options Notif:", optionsNotif)
			fmt.Println("User Answers:", userAnswers)
		*/
		m := make(map[string]string)
		err2 := json.Unmarshal([]byte(userAnswersStr), &m)
		if err2 != nil {
			fmt.Println("Error unmarshaling userAnswers:", err)
		}
		value, ok := m[username]
		if ok {
			fmt.Println("Value for key "+username+":", value)
		} else {
			fmt.Println("Key " + username + " not found")
		}
		options := []string{"option1", "option2", "option3", "option4"}

		selectedOption := 0
		for index, option := range options {
			if value == option {
				// The value matches one of the options
				selectedOption = index
				break
			}
		}
		if isNumberInSlice(selectedOption, optionsNotif) {

			startDateTime, err := time.Parse("2006-01-02T15:04", startDate)
			if err != nil {
				return fmt.Errorf("could not parse start date: %v", err)
			}

			if time.Now().After(startDateTime) {

				endDateTime, err := time.Parse("2006-01-02T15:04", endDate)
				if err != nil {
					return fmt.Errorf("could not parse end date: %v", err)
				}

				if time.Now().After(endDateTime) {
					fmt.Println("Event ended")
				} else {
					if !CheckNotifs("eventNotif", creator, username, 0) {
						AddNotifs("eventNotif", creator, username, 0)
					}
				}
			} else {
				fmt.Println("Event hasn't started yet")
			}
		} else {
			fmt.Println("Number", selectedOption, "is not in the slice")
		}
	}
	return nil
}

func isNumberInSlice(num int, slice []int) bool {
	for _, n := range slice {
		if n == num {
			return true
		}
	}
	return false
}

func scanEvent(row *sql.Row) (*GroupEvent, error) {
	event := &GroupEvent{}
	err := row.Scan(&event.ID, &event.Creator, &event.Title, &event.Description, &event.Date, &event.StartDate, &event.EndDate, &event.GroupID, &event.Option1, &event.Option2, &event.Option3, &event.Option4, &event.OptionsNotif, &event.UserAnswers)
	if err != nil {
		return nil, err
	}
	return event, nil
}

func CheckNotifs(Type string, Sender string, Receiver string, GroupID int) bool {
	db, err := sql.Open("sqlite3", "./social.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	row := db.QueryRow("SELECT COUNT(*) FROM notifications WHERE type=? AND sender=? AND receiver=? AND groupid=?", Type, Sender, Receiver, GroupID)
	var count int
	err = row.Scan(&count)
	if err != nil {
		log.Fatal(err)
	}
	return count > 0
}
