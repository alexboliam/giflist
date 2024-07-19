import { Component, inject, input } from '@angular/core';
import { Gif } from '@shared/interfaces';
import { GifPlayerComponent } from "../gif-player/gif-player.component";
import { WINDOW } from '@shared/utils/injection-tokens';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-gif-list',
  standalone: true,
  imports: [GifPlayerComponent, MatToolbar, MatIcon],
  templateUrl: './gif-list.component.html',
  styleUrl: './gif-list.component.less'
})
export class GifListComponent {
  gifs = input.required<Gif[]>();
  window = inject(WINDOW);
}
