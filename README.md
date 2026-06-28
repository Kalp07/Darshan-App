# દર્શન

There is a mini iPad in my house that nobody really uses. And there is my grandma, Baa, who asks someone every day to put on the live stream from a temple on the TV.

The concept of darshan — the act of being in the presence of the divine, of simply _seeing_ — is something that shaped her life in a way that is hard to explain to someone who didn't grow up around it. When she was young, going to a temple was not casual. It was infrequent, planned, significant. You didn't just go. So the idea that she can now witness the morning aarti at Somnath from her home, in real time, is not a small thing to her. It is still darshan. It matters just as much as it did when she was a child.

The problem is that she cannot operate the TV. The OS is a maze, and even printed instructions with pictures can fail because a software update prompt appears and breaks the whole flow. She has spent a lifetime learning how to care for people, build a home, and keep traditions alive. A television operating system was never meant to be a part of that.

So I built this. A simple web app, installed as a PWA on the iPad, that lives on the home screen. Image cards, one for each temple. She taps one to visit it. If the temple is live on YouTube at that moment, the stream opens. If not, she gets a gentle screen that tells her so, with a button to browse recent videos. That is the whole thing.

The UI is in Gujarati with large text and buttons for accessibility. Once a stream opens, the back button automatically hides after a few seconds and the video becomes temporarily non-interactive, preventing accidental touches. A single tap anywhere on the screen restores normal controls and brings the back button back.

I am a programmer. She is my grandma. This is the most useful thing I have built.

---

_Built with the YouTube Data API v3, hosted on GitHub Pages, installed via Safari's Add to Home Screen._
