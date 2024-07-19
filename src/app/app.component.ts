import { Component, effect, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { RedditService } from '@shared/data-access/reddit.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less'
})
export class AppComponent {
  redditService = inject(RedditService);
  snackBar = inject(MatSnackBar);

  constructor() {
    effect(() => {
      const error = this.redditService.error();

      if (error != null) {
        this.snackBar.open(error, 'Dismiss', { duration: 2000 });
      }
    });
  }
}
