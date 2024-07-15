import { Component, inject } from '@angular/core';
import { GifListComponent } from "./ui/gif-list/gif-list.component";
import { RedditService } from '../shared/data-access/reddit.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [GifListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.less'
})
export default class HomeComponent {
  redditService = inject(RedditService);
}
