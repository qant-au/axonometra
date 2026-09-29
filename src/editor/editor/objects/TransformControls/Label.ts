import { Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { formatPlanLength } from '../../../../helpers/planLength';
import { Point } from '../../../../helpers/Point';
import { LABEL_COLOR, LABEL_FONT, LABEL_FONT_SIZE } from '../../constants';

export class Label extends Container {
  text: Text;
  textStyle: TextStyle = new TextStyle({
    fontFamily: LABEL_FONT,
    fontSize: LABEL_FONT_SIZE,
    fill: LABEL_COLOR,
    align: 'center'
  });
  textBkg: Sprite = new Sprite(Texture.WHITE);
  constructor(sizeInPixels?: number) {
    super();
    if (!sizeInPixels) {
      sizeInPixels = 0;
    }
    this.text = new Text({ text: '', style: this.textStyle });
    this.update(sizeInPixels);

    this.addChild(this.textBkg);
    this.addChild(this.text);
    this.pivot.set(this.width / 2, this.height / 2);
    this.zIndex = 1001;
  }

  public update(sizeInPixels: number) {
    this.text.text = formatPlanLength(Math.abs(sizeInPixels));
    this.textBkg.width = this.text.width;
    this.textBkg.height = this.text.height;
  }

  public updatePos(pos: Point, sizeInPixels: number) {
    this.position.set(pos.x, pos.y);
    this.update(sizeInPixels);
  }
}
