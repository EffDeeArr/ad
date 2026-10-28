package main

// Arberia Deathmatch updater: downloads the newest game files from the GitHub repository's latest release,
// checks every file against the release's hash list, backs up what it replaces, and installs it.

import (
	"archive/zip"
	"bufio"
	"bytes"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const repo = "EffDeeArr/ad"
const assetName = "game-files.zip"

type meta struct {
	To      string            `json:"to"`
	Hashes  map[string]string `json:"hashes"`
	Deleted []string          `json:"deleted"`
}

func wait() {
	fmt.Println()
	fmt.Print("Press Enter to close...")
	bufio.NewReader(os.Stdin).ReadString('\n')
}

func fail(f string, a ...interface{}) {
	fmt.Printf("\nERROR: "+f+"\n", a...)
	wait()
	os.Exit(1)
}

func readVer(appDir string) string {
	b, err := os.ReadFile(filepath.Join(appDir, "package.json"))
	if err != nil {
		return ""
	}
	var p struct {
		Version string `json:"version"`
	}
	if json.Unmarshal(b, &p) != nil {
		return ""
	}
	// package.json holds a three-part version (0.44.0); the game's own version style is 0.44
	v := p.Version
	if strings.HasPrefix(v, "0.") && strings.HasSuffix(v, ".0") && strings.Count(v, ".") == 2 {
		v = strings.TrimSuffix(v, ".0")
	}
	return v
}

// the game's files live in <game folder>/resources/app
func findApp(start string) string {
	cands := []string{start, filepath.Join(start, "resources", "app"), filepath.Join(start, "..", "resources", "app")}
	for _, c := range cands {
		if readVer(c) != "" {
			if _, err := os.Stat(filepath.Join(c, "game", "index.html")); err == nil {
				return c
			}
		}
	}
	return ""
}

func get(url string, limit int64) ([]byte, error) {
	cl := &http.Client{Timeout: 120 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "ArberiaDeathmatch-Updater")
	req.Header.Set("Accept", "application/vnd.github+json")
	r, err := cl.Do(req)
	if err != nil {
		return nil, err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return nil, fmt.Errorf("%s answered %s", url, r.Status)
	}
	return io.ReadAll(io.LimitReader(r.Body, limit))
}

func safe(name string) bool {
	if name == "" || strings.Contains(name, "..") || strings.HasPrefix(name, "/") || strings.Contains(name, "\\") || strings.Contains(name, ":") {
		return false
	}
	return true
}

func main() {
	fmt.Println("Arberia Deathmatch updater")
	fmt.Println()

	var start string
	if len(os.Args) > 1 {
		start = os.Args[1]
	} else if exe, err := os.Executable(); err == nil {
		start = filepath.Dir(exe)
	} else {
		start, _ = os.Getwd()
	}
	app := findApp(start)
	if app == "" {
		if wd, err := os.Getwd(); err == nil {
			app = findApp(wd)
		}
	}
	if app == "" {
		fmt.Println("Could not find the game here. Type or paste the path of your game folder")
		fmt.Println("(the folder that contains 'Arberia Deathmatch.exe'), then press Enter:")
		s, _ := bufio.NewReader(os.Stdin).ReadString('\n')
		app = findApp(strings.Trim(strings.TrimSpace(s), "\""))
	}
	if app == "" {
		fail("that is not an Arberia Deathmatch game folder (needs resources\\app inside). If your game is a single .exe, the updater cannot be used; get the full folder version first.")
	}
	cur := readVer(app)
	fmt.Println("Game found:", app)
	fmt.Println("Installed version:", cur)

	api := os.Getenv("ARBERIA_UPDATE_API")
	if api == "" {
		api = "https://api.github.com"
	}
	fmt.Println("Checking github.com/" + repo + " for the newest version...")
	b, err := get(api+"/repos/"+repo+"/releases/latest", 4<<20)
	if err != nil {
		fail("could not reach GitHub (%v). Check your internet connection and try again.", err)
	}
	var rel struct {
		Tag    string `json:"tag_name"`
		Assets []struct {
			Name string `json:"name"`
			URL  string `json:"browser_download_url"`
		} `json:"assets"`
	}
	if json.Unmarshal(b, &rel) != nil || rel.Tag == "" {
		fail("GitHub's answer was not understood.")
	}
	latest := strings.TrimPrefix(rel.Tag, "v")
	fmt.Println("Newest version:", latest)
	if cur == latest {
		fmt.Println("\nYou already have the newest version - nothing to do.")
		wait()
		return
	}
	url := ""
	for _, a := range rel.Assets {
		if a.Name == assetName {
			url = a.URL
		}
	}
	if url == "" {
		fail("release %s has no %s file attached.", rel.Tag, assetName)
	}
	fmt.Println("Downloading", assetName, "...")
	data, err := get(url, 200<<20)
	if err != nil {
		fail("download failed: %v", err)
	}
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		fail("the downloaded update is damaged: %v", err)
	}
	var m meta
	for _, f := range zr.File {
		if f.Name == "patch.json" {
			rc, _ := f.Open()
			pb, _ := io.ReadAll(rc)
			rc.Close()
			json.Unmarshal(pb, &m)
		}
	}
	if m.To == "" || len(m.Hashes) == 0 {
		fail("the downloaded update has no file list.")
	}
	if m.To != latest {
		fail("the update says it is version %s but the release is %s.", m.To, latest)
	}

	bak := filepath.Join(filepath.Dir(app), "app-backup-"+strings.NewReplacer("\\", "_", "/", "_", ":", "_").Replace(cur))
	n := 0
	for _, f := range zr.File {
		if f.Name == "patch.json" || strings.HasSuffix(f.Name, "/") {
			continue
		}
		want := m.Hashes[f.Name]
		if want == "" || !safe(f.Name) {
			fail("the update contains an unexpected file (%s); nothing was changed after this point.", f.Name)
		}
		rc, err := f.Open()
		if err != nil {
			fail("%v", err)
		}
		nd, _ := io.ReadAll(rc)
		rc.Close()
		if fmt.Sprintf("%x", sha1.Sum(nd)) != want {
			fail("%s did not match its checksum; the download is damaged or was changed. Nothing more was written.", f.Name)
		}
		dst := filepath.Join(app, filepath.FromSlash(f.Name))
		if old, err := os.ReadFile(dst); err == nil {
			if fmt.Sprintf("%x", sha1.Sum(old)) == want {
				continue
			}
			bp := filepath.Join(bak, filepath.FromSlash(f.Name))
			os.MkdirAll(filepath.Dir(bp), 0o755)
			os.WriteFile(bp, old, 0o644)
		}
		os.MkdirAll(filepath.Dir(dst), 0o755)
		if err := os.WriteFile(dst, nd, 0o644); err != nil {
			fail("could not write %s (is the game still running? close it and try again): %v", f.Name, err)
		}
		fmt.Println("  updated", f.Name)
		n++
	}
	for _, d := range m.Deleted {
		if !safe(d) {
			continue
		}
		dst := filepath.Join(app, filepath.FromSlash(d))
		if old, err := os.ReadFile(dst); err == nil {
			bp := filepath.Join(bak, filepath.FromSlash(d))
			os.MkdirAll(filepath.Dir(bp), 0o755)
			os.WriteFile(bp, old, 0o644)
			os.Remove(dst)
			fmt.Println("  removed", d)
		}
	}
	fmt.Printf("\nDone! Updated %d file(s) to version %s.\nA backup of the old files is in: %s\n", n, m.To, bak)
	wait()
}
