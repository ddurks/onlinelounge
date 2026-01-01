export class Leaderboard extends Phaser.GameObjects.Group {
  constructor(scene, x, y, pageNum) {
    super(scene);

    this.titles = [];
    this.pages = [];
    this.pageMax = pageNum;
    this.currentPage = 0;
    this.spacing = 85;
    this.spacingY = 25;
    this.startX = x - this.spacing;
    this.startY = y + this.spacingY / 2;
    this.listItems = 5;

    let bg = scene.add
      .image(x, y + 20, "board")
      .setVisible(false)
      .setScale(3);
    this.add(bg);

    for (let i = 0; i < pageNum; i++) {
      this.titles[i] = scene.add
        .text(this.startX, y, "test" + i, {
          fontFamily: "Arial",
          fontStyle: "bold",
          fontSize: "32px",
          color: "#0000EE",
          underline: {
            color: "#0000EE",
            thickness: "5px",
          },
          wordWrap: {
            width: 320,
            useAdvancedWrap: true,
          },
          align: "center",
        })
        .setInteractive({ useHandCursor: true })
        .setVisible(false)
        .setOrigin(0.5, 0.5);
      this.titles[i].titleName = "test" + i;
      this.titles[i].titleIndex = i;
      this.titles[i].on("pointerdown", () => this.pageTo(i));
      this.add(this.titles[i]);
      this.pages[i] = new Phaser.GameObjects.Group();
      this.startY = y + this.spacingY / 2;
      for (let j = 0; j < this.listItems; j++) {
        let listLine = scene.add
          .text(x, this.startY, "test body " + i + " " + j, {
            fontFamily: "Arial",
            fontStyle: "bold",
            fontSize: "24px",
            color: "#ffffff",
            wordWrap: {
              width: 320,
              useAdvancedWrap: true,
            },
            align: "center",
          })
          .setOrigin(0.5, 0)
          .setVisible(false)
          .setStroke("#000000", 3);
        this.pages[i].add(listLine);
        this.startY += this.spacingY;
      }

      this.startX += this.spacing;
    }
  }

  setData(leaderboard) {
    Object.entries(leaderboard).forEach(([statName, statList], index) => {
      this.titles[index].setText(this.getStatName(statName));
      let textLines = this.pages[index].getChildren();
      let lineIndex = textLines.length - 1;
      statList.forEach((statline) => {
        textLines[lineIndex].setText(statline);
        lineIndex--;
      });
    });
  }

  getStatName(statName) {
    switch (statName) {
      case "coins":
        return "💰";
      case "deaths":
        return "💀";
      case "kills":
        return "🔫";
      default:
        return statName;
    }
  }

  toggleDisplay() {
    this.toggleVisible();
    this.pages[this.currentPage].toggleVisible();
    this.titles[this.currentPage].setStyle({ backgroundColor: "#000000" });
  }

  pageTo(pageNum) {
    this.currentPage = pageNum;
    this.pages.forEach((page, index) =>
      index === this.currentPage
        ? page.setVisible(true)
        : page.setVisible(false)
    );
    this.titles.forEach((title, index) =>
      index === this.currentPage
        ? title.setStyle({ backgroundColor: "#000000" })
        : title.setStyle({ backgroundColor: "transparent" })
    );
  }

  close() {
    this.setVisible();
    this.pages.forEach((page) => page.setVisible(false));
    this.titles.forEach((title) =>
      title.setStyle({ backgroundColor: "transparent" })
    );
  }
}
