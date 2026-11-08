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

type httpErr struct {
	url    string
	status int
	text   string
}

func (e *httpErr) Error() string { return e.url + " answered " + e.text }

func get1(url, accept string, limit int64) ([]byte, error) {
	cl := &http.Client{Timeout: 300 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "ArberiaDeathmatch-Updater")
	req.Header.Set("Accept", accept)
	r, err := cl.Do(req)
	if err != nil {
		return nil, err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return nil, &httpErr{url, r.StatusCode, r.Status}
	}
	return io.ReadAll(io.LimitReader(r.Body, limit))
}

// GitHub's file servers now and then answer 502/503/504 or time out for a while: every download is tried several times, pausing in between,
// over each route given (the release download link, then GitHub's API download link). A missing file (404) is not retried on that route.
func getRetry(routes [][2]string, limit int64) ([]byte, error) {
	var last error
	waits := []time.Duration{2 * time.Second, 5 * time.Second, 12 * time.Second}
	for t := 0; t < 4; t++ {
		for _, rt := range routes {
			if rt[0] == "" {
				continue
			}
			b, err := get1(rt[0], rt[1], limit)
			if err == nil {
				return b, nil
			}
			last = err
		}
		if t < 3 {
			fmt.Println("  GitHub did not answer properly (", last, ") - trying again in", waits[t])
			time.Sleep(waits[t])
		}
	}
	return nil, last
}

func get(url string, limit int64) ([]byte, error) {
	return getRetry([][2]string{{url, "application/vnd.github+json"}}, limit)
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
			Name  string `json:"name"`
			URL   string `json:"browser_download_url"`
			API   string `json:"url"`
			State string `json:"state"`
			Size  int64  `json:"size"`
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
	url, apiURL := "", ""
	for _, a := range rel.Assets {
		if a.Name == assetName {
			if (a.State != "" && a.State != "uploaded") || a.Size <= 0 {
				fail("release %s is still being published (its %s is not fully uploaded yet). Try again in a few minutes.", rel.Tag, assetName)
			}
			url, apiURL = a.URL, a.API
		}
	}
	if url == "" {
		fail("release %s has no %s file attached.", rel.Tag, assetName)
	}
	fmt.Println("Downloading", assetName, "...")
	data, err := getRetry([][2]string{{url, "application/octet-stream"}, {apiURL, "application/octet-stream"}}, 200<<20)
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
