import { Component, input } from '@angular/core';
import { Gif } from '../../../shared/interfaces';
import { GifPlayerComponent } from "../gif-player/gif-player.component";

@Component({
  selector: 'app-gif-list',
  standalone: true,
  imports: [GifPlayerComponent],
  templateUrl: './gif-list.component.html',
  styleUrl: './gif-list.component.less'
})
export class GifListComponent {
  gifs = input.required<Gif[]>();
}
